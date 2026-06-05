from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.investment import Investment
from app.models.income import Income
from app.models.financial_goal import Financial_Goal
from app.schemas.investment_schema import (
    Investment_Schema_Create,
    Investment_Schema_Update,
    Investment_Schema_Response,
)
from app.repositories.investment_repository import Investment_Repository

router = APIRouter(prefix="/investment", tags=["investment"])
repository = Investment_Repository()


# ── Helper: recalcula current_value de um investimento ───────────────────────

def _recalculate_current_value(db: Session, investment: Investment) -> None:
    """
    current_value = invested_value (aporte inicial)
                  + SUM(income WHERE type=aporte)     ← aumenta principal
                  + SUM(income WHERE type=rendimento)  ← juros
                  - SUM(ABS(income WHERE type=resgate)) ← retiradas

    invested_value também é atualizado para refletir o principal real:
      invested_value = aporte_inicial + aportes_adicionais - resgates
    """
    from app.models.income_type import Income_Type

    incomes = db.query(Income).filter(Income.investment_id == investment.id).all()

    aporte_ids = {
        t.id for t in db.query(Income_Type).all()
        if "aporte" in t.description.lower()
    }
    rendimento_ids = {
        t.id for t in db.query(Income_Type).all()
        if "rendimento" in t.description.lower()
    }
    resgate_ids = {
        t.id for t in db.query(Income_Type).all()
        if "resgate" in t.description.lower()
    }

    aportes_adicionais = sum(
        float(i.income_value) for i in incomes
        if i.income_type_id in aporte_ids
    )
    rendimentos = sum(
        float(i.income_value) for i in incomes
        if i.income_type_id in rendimento_ids
    )
    resgates = sum(
        abs(float(i.income_value)) for i in incomes
        if i.income_type_id in resgate_ids
    )

    invested_base = float(investment.invested_value or 0)
    investment.current_value = invested_base + aportes_adicionais + rendimentos - resgates
    db.flush()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=Investment_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Investment_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    payload["user_id"] = current_user.id
    payload["current_value"] = payload.get("invested_value", 0)

    inv = repository.create(db, payload)

    # Liga à meta se informado
    if payload.get("goal_id"):
        meta = db.query(Financial_Goal).filter(
            Financial_Goal.id == payload["goal_id"],
            Financial_Goal.user_id == current_user.id
        ).first()
        if meta:
            meta.investment_id = inv.id
            db.commit()

    return inv


@router.get("/", response_model=List[Investment_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/by-finalidade/{finalidade}", response_model=List[Investment_Schema_Response])
def get_by_finalidade(
    finalidade: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Investment).filter(
        Investment.user_id == current_user.id,
        Investment.finalidade == finalidade,
        Investment.status == "ativo",
    ).all()


@router.get("/reserva-emergencia", response_model=dict)
def get_reserva_emergencia(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o valor atual da reserva de emergência (finalidade='R.E')."""
    inv = db.query(Investment).filter(
        Investment.user_id == current_user.id,
        Investment.finalidade == "R.E",
        Investment.status == "ativo",
    ).first()

    if not inv:
        return {"valor": 0.0, "investimento": None}

    return {
        "valor": float(inv.current_value or inv.invested_value or 0),
        "investimento": inv,
    }


@router.get("/{id}", response_model=Investment_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Investment {id} not found")
    return obj


@router.patch("/{id}", response_model=Investment_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Investment_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Investment {id} not found")

    update_data = data.model_dump(exclude_unset=True)

    # Se mudou goal_id, atualiza a meta
    if "goal_id" in update_data:
        # Desvincula meta anterior
        old_meta = db.query(Financial_Goal).filter(
            Financial_Goal.investment_id == id
        ).first()
        if old_meta:
            old_meta.investment_id = None

        # Vincula nova meta
        if update_data["goal_id"]:
            new_meta = db.query(Financial_Goal).filter(
                Financial_Goal.id == update_data["goal_id"],
                Financial_Goal.user_id == current_user.id
            ).first()
            if new_meta:
                new_meta.investment_id = id
        update_data.pop("goal_id")

    inv = repository.update(db, obj, update_data)
    _recalculate_current_value(db, inv)
    db.commit()
    return inv


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Investment {id} not found")

    # Desvincula meta
    meta = db.query(Financial_Goal).filter(
        Financial_Goal.investment_id == id
    ).first()
    if meta:
        meta.investment_id = None
        db.flush()

    # income é deletado em CASCADE pela FK
    repository.delete(db, obj)