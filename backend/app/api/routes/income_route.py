from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.investment import Investment
from app.models.income import Income
from app.models.income_type import Income_Type
from app.schemas.income_schema import (
    Income_Schema_Create,
    Income_Schema_Update,
    Income_Schema_Response,
)
from app.repositories.income_repository import Income_Repository
from app.repositories.investment_repository import Investment_Repository

router = APIRouter(prefix="/income", tags=["income"])
repository       = Income_Repository()
inv_repository   = Investment_Repository()


# ── Helper: recalcula current_value após qualquer movimento ──────────────────

def _recalculate_current_value(db: Session, investment: Investment) -> None:
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

    aportes     = sum(float(i.income_value) for i in incomes if i.income_type_id in aporte_ids)
    rendimentos = sum(float(i.income_value) for i in incomes if i.income_type_id in rendimento_ids)
    resgates    = sum(abs(float(i.income_value)) for i in incomes if i.income_type_id in resgate_ids)

    base = float(investment.invested_value or 0)
    investment.current_value = base + aportes + rendimentos - resgates
    db.flush()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=Income_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Income_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = inv_repository.get_by_id_and_user(db, data.investment_id, current_user.id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"Investment {data.investment_id} not found")

    income_type = db.get(Income_Type, data.income_type_id)
    if not income_type:
        raise HTTPException(status_code=404, detail=f"Income Type {data.income_type_id} not found")

    income = repository.create(db, data.model_dump())

    # Recalcula current_value do investimento
    _recalculate_current_value(db, inv)
    db.commit()
    db.refresh(income)
    return income


@router.get("/", response_model=List[Income_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Filtra apenas incomes de investimentos do usuário
    inv_ids = [
        i.id for i in db.query(Investment.id)
        .filter(Investment.user_id == current_user.id).all()
    ]
    return db.query(Income).filter(Income.investment_id.in_(inv_ids)).all()


@router.get("/types", response_model=List[dict], status_code=status.HTTP_200_OK)
def get_income_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    types = db.query(Income_Type).all()
    return [{"id": t.id, "description": t.description, "acronym": getattr(t, "acronym", "")} for t in types]


@router.get("/investment/{investment_id}", response_model=List[Income_Schema_Response])
def get_by_investment(
    investment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = inv_repository.get_by_id_and_user(db, investment_id, current_user.id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"Investment {investment_id} not found")
    return repository.get_all_by_investment(db, investment_id)


@router.get("/{id}", response_model=Income_Schema_Response)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Income {id} not found")
    return obj


@router.patch("/{id}", response_model=Income_Schema_Response)
def update(
    id: int,
    data: Income_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Income {id} not found")

    # Verifica ownership via investimento
    inv = inv_repository.get_by_id_and_user(db, obj.investment_id, current_user.id)
    if not inv:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)

    if "income_type_id" in update_data:
        if not db.get(Income_Type, update_data["income_type_id"]):
            raise HTTPException(status_code=404, detail=f"Income Type {update_data['income_type_id']} not found")

    updated = repository.update(db, obj, update_data)
    _recalculate_current_value(db, inv)
    db.commit()
    db.refresh(updated)
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Income {id} not found")

    inv = inv_repository.get_by_id_and_user(db, obj.investment_id, current_user.id)
    if not inv:
        raise HTTPException(status_code=403, detail="Not authorized")

    repository.delete(db, obj)
    _recalculate_current_value(db, inv)
    db.commit()