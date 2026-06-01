from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

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

router = APIRouter(prefix="/budget", tags=["budget"])
repository = Budget_Repository()


def _enrich_budget(db: Session, budget, user_id: int):
    """
    Calcula current_spent e consumed_percentage dinamicamente
    somando as transações negativas da categoria no mês/ano do orçamento.
    """
    spent = db.query(func.sum(Transaction.transaction_value)).filter(
        Transaction.user_id == user_id,
        Transaction.transaction_category_id == budget.category_id,
        Transaction.transaction_value < 0,
        func.extract("month", Transaction.transaction_date) == budget.month,
        func.extract("year",  Transaction.transaction_date) == budget.year,
    ).scalar() or 0

    spent_abs = abs(float(spent))
    limit     = float(budget.limit_value)
    pct       = round((spent_abs / limit) * 100, 2) if limit > 0 else 0.0

    budget.current_spent       = spent_abs
    budget.consumed_percentage = pct
    return budget


@router.post("/", response_model=Budget_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Budget_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = db.get(Transaction_Category, data.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category with id {data.category_id} not found"
        )

    payload = data.model_dump()
    payload["user_id"] = current_user.id

    budget = repository.create(db, payload)
    return _enrich_budget(db, budget, current_user.id)


@router.get("/", response_model=List[Budget_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = repository.get_all_by_user(db, current_user.id)
    return [_enrich_budget(db, b, current_user.id) for b in budgets]


@router.get("/filter", response_model=List[Budget_Schema_Response], status_code=status.HTTP_200_OK)
def get_by_month_year(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = repository.get_by_month_year(db, current_user.id, month, year)
    return [_enrich_budget(db, b, current_user.id) for b in budgets]


@router.get("/{id}", response_model=Budget_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget with id {id} not found"
        )
    return _enrich_budget(db, obj, current_user.id)


@router.patch("/{id}", response_model=Budget_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Budget_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "category_id" in update_data:
        category = db.get(Transaction_Category, update_data["category_id"])
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction Category with id {update_data['category_id']} not found"
            )

    obj = repository.update(db, obj, update_data)
    return _enrich_budget(db, obj, current_user.id)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget with id {id} not found"
        )
    repository.delete(db, obj)