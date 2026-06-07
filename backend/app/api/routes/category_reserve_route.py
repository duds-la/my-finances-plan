from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.transaction_category import Transaction_Category
from app.models.category_reserve import Category_Reserve
from app.schemas.category_reserve_schema import (
    Category_Reserve_Schema_Create,
    Category_Reserve_Schema_Update,
    Category_Reserve_Schema_Response,
    Category_Reserve_Schema_Enriched,
    Reserve_Summary_Schema,
)
from app.repositories.category_reserve_repository import Category_Reserve_Repository
from app.utils.installment_utils import get_committed_by_category

router = APIRouter(prefix="/category_reserve", tags=["category_reserve"])
repository = Category_Reserve_Repository()


def _enrich_reserve(
    db: Session,
    reserve: Category_Reserve,
    user_id: int,
    month: int,
    year: int,
) -> Category_Reserve_Schema_Enriched:
    cat = db.get(Transaction_Category, reserve.category_id)

    spent_raw = (
        db.query(func.sum(Transaction.transaction_value))
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_category_id == reserve.category_id,
            Transaction.transaction_value < 0,
            func.extract("month", Transaction.transaction_date) == month,
            func.extract("year",  Transaction.transaction_date) == year,
        )
        .scalar()
        or 0
    )
    spent = abs(float(spent_raw))

    committed = get_committed_by_category(db, user_id, reserve.category_id, month, year)

    reserved  = float(reserve.reserved_value)
    available = max(0.0, reserved - spent - committed)
    spent_pct     = round((spent     / reserved) * 100, 2) if reserved > 0 else 0.0
    committed_pct = round((committed / reserved) * 100, 2) if reserved > 0 else 0.0

    return Category_Reserve_Schema_Enriched(
        id=reserve.id,
        user_id=reserve.user_id,
        category_id=reserve.category_id,
        category_name=cat.description if cat else "—",
        category_acronym=(cat.acronym or "?").strip() if cat else "?",
        month=reserve.month,
        year=reserve.year,
        reserved_value=reserved,
        spent_value=spent,
        committed_value=committed,
        available_value=available,
        spent_percentage=spent_pct,
        committed_percentage=committed_pct,
        note=reserve.note,
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=Category_Reserve_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Category_Reserve_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = db.get(Transaction_Category, data.category_id)
    if not category:
        raise HTTPException(status_code=404, detail=f"Transaction Category with id {data.category_id} not found")

    existing = repository.get_by_category_month_year(
        db, current_user.id, data.category_id, data.month, data.year
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A reserve for category {data.category_id} in {data.month}/{data.year} already exists."
        )

    payload = data.model_dump()
    payload["user_id"] = current_user.id
    return repository.create(db, payload)


@router.get("/", response_model=List[Category_Reserve_Schema_Response], status_code=200)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/summary", response_model=Reserve_Summary_Schema, status_code=200)
def get_summary(
    month: int | None = None,
    year:  int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now   = datetime.utcnow()
    month = month or now.month
    year  = year  or now.year

    reserves = repository.get_by_month_year(db, current_user.id, month, year)
    enriched = [_enrich_reserve(db, r, current_user.id, month, year) for r in reserves]

    total_reserved  = sum(e.reserved_value   for e in enriched)
    total_spent     = sum(e.spent_value      for e in enriched)
    total_committed = sum(e.committed_value  for e in enriched)
    total_available = sum(e.available_value  for e in enriched)

    # Saldo livre = saldo total de transações do mês - total reservado
    saldo_raw = (
        db.query(func.sum(Transaction.transaction_value))
        .filter(
            Transaction.user_id == current_user.id,
            func.extract("month", Transaction.transaction_date) == month,
            func.extract("year",  Transaction.transaction_date) == year,
        )
        .scalar()
        or 0
    )
    free_balance = float(saldo_raw) - total_reserved

    return Reserve_Summary_Schema(
        total_reserved=total_reserved,
        total_spent=total_spent,
        total_committed=total_committed,
        total_available=total_available,
        free_balance=free_balance,
        reserves=enriched,
    )


@router.get("/{id}", response_model=Category_Reserve_Schema_Response, status_code=200)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Category Reserve with id {id} not found")
    return obj


@router.patch("/{id}", response_model=Category_Reserve_Schema_Response, status_code=200)
def update(
    id: int,
    data: Category_Reserve_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Category Reserve with id {id} not found")
    return repository.update(db, obj, data.model_dump(exclude_unset=True))


@router.delete("/{id}", status_code=204)
def delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Category Reserve with id {id} not found")
    repository.delete(db, obj)