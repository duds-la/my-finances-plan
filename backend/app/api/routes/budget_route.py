from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.transaction_category import Transaction_Category
from app.schemas.budget_schema import (
    Budget_Schema_Create,
    Budget_Schema_Update,
    Budget_Schema_Response,
)
from app.repositories.budget_repository import Budget_Repository
from app.utils.installment_utils import get_committed_by_category

router = APIRouter(prefix="/budget", tags=["budget"])
repository = Budget_Repository()


def _enrich_budget(db: Session, budget, user_id: int):
    spent_raw = (
        db.query(func.sum(Transaction.transaction_value))
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_category_id == budget.category_id,
            Transaction.transaction_value < 0,
            func.extract("month", Transaction.transaction_date) == budget.month,
            func.extract("year",  Transaction.transaction_date) == budget.year,
        )
        .scalar()
        or 0
    )
    spent_abs = abs(float(spent_raw))
    limit     = float(budget.limit_value)
    pct       = round((spent_abs / limit) * 100, 2) if limit > 0 else 0.0

    committed = get_committed_by_category(
        db, user_id, budget.category_id, budget.month, budget.year
    )

    budget.current_spent       = spent_abs
    budget.consumed_percentage = pct
    budget.committed_value     = committed
    budget.effective_remaining = max(0.0, limit - spent_abs - committed)
    return budget


# ── Schema para o endpoint de cópia ──────────────────────────────────────────

class Budget_Copy_Request(BaseModel):
    from_month: int
    from_year: int
    to_month: int
    to_year: int
    overwrite: bool = False  # se True, sobrescreve categorias que já existem no destino


class Budget_Copy_Response(BaseModel):
    created: int
    skipped: int
    overwritten: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=Budget_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Budget_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = db.get(Transaction_Category, data.category_id)
    if not category:
        raise HTTPException(status_code=404, detail=f"Transaction Category with id {data.category_id} not found")

    payload = data.model_dump()
    payload["user_id"] = current_user.id
    budget = repository.create(db, payload)
    return _enrich_budget(db, budget, current_user.id)


@router.post("/copy", response_model=Budget_Copy_Response, status_code=status.HTTP_200_OK)
def copy_budgets(
    data: Budget_Copy_Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Copia todos os orçamentos de from_month/from_year para to_month/to_year.
    - Categorias que já existem no destino são puladas (ou sobrescritas se overwrite=True).
    - Retorna quantos foram criados, pulados e sobrescritos.
    """
    if data.from_month == data.to_month and data.from_year == data.to_year:
        raise HTTPException(status_code=400, detail="Mês de origem e destino são iguais.")

    source_budgets = repository.get_by_month_year(
        db, current_user.id, data.from_month, data.from_year
    )
    if not source_budgets:
        raise HTTPException(
            status_code=404,
            detail=f"Nenhum orçamento encontrado em {data.from_month}/{data.from_year}."
        )

    dest_budgets = repository.get_by_month_year(
        db, current_user.id, data.to_month, data.to_year
    )
    dest_cat_ids = {b.category_id: b for b in dest_budgets}

    created = skipped = overwritten = 0

    for src in source_budgets:
        existing = dest_cat_ids.get(src.category_id)

        if existing:
            if data.overwrite:
                repository.update(db, existing, {"limit_value": src.limit_value})
                overwritten += 1
            else:
                skipped += 1
        else:
            repository.create(db, {
                "user_id":     current_user.id,
                "category_id": src.category_id,
                "month":       data.to_month,
                "year":        data.to_year,
                "limit_value": src.limit_value,
            })
            created += 1

    return Budget_Copy_Response(created=created, skipped=skipped, overwritten=overwritten)


@router.get("/", response_model=List[Budget_Schema_Response], status_code=200)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = repository.get_all_by_user(db, current_user.id)
    return [_enrich_budget(db, b, current_user.id) for b in budgets]


@router.get("/filter", response_model=List[Budget_Schema_Response], status_code=200)
def get_by_month_year(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = repository.get_by_month_year(db, current_user.id, month, year)
    return [_enrich_budget(db, b, current_user.id) for b in budgets]


@router.get("/{id}", response_model=Budget_Schema_Response, status_code=200)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Budget with id {id} not found")
    return _enrich_budget(db, obj, current_user.id)


@router.patch("/{id}", response_model=Budget_Schema_Response, status_code=200)
def update(
    id: int,
    data: Budget_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Budget with id {id} not found")

    update_data = data.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        if not db.get(Transaction_Category, update_data["category_id"]):
            raise HTTPException(status_code=404, detail=f"Transaction Category with id {update_data['category_id']} not found")

    obj = repository.update(db, obj, update_data)
    return _enrich_budget(db, obj, current_user.id)


@router.delete("/{id}", status_code=204)
def delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Budget with id {id} not found")
    repository.delete(db, obj)