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

router = APIRouter(prefix="/category_reserve", tags=["category_reserve"])
repository = Category_Reserve_Repository()


def _enrich_reserve(
    db: Session,
    reserve: Category_Reserve,
    user_id: int,
    month: int,
    year: int,
) -> Category_Reserve_Schema_Enriched:
    """Enriquece uma reserva com dados de gasto real do mês/ano informado."""
    cat = db.get(Transaction_Category, reserve.category_id)

    spent_raw = (
        db.query(func.sum(Transaction.transaction_value))
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_category_id == reserve.category_id,
            Transaction.transaction_value < 0,
            func.extract("month", Transaction.transaction_date) == month,
            func.extract("year", Transaction.transaction_date) == year,
        )
        .scalar()
        or 0
    )

    spent = abs(float(spent_raw))
    reserved = float(reserve.reserved_value)
    available = max(0.0, reserved - spent)
    pct = round((spent / reserved) * 100, 2) if reserved > 0 else 0.0

    return Category_Reserve_Schema_Enriched(
        id=reserve.id,
        user_id=reserve.user_id,
        category_id=reserve.category_id,
        category_name=cat.description if cat else "—",
        category_acronym=cat.acronym if cat else "?",
        reserved_value=reserved,
        spent_value=spent,
        available_value=available,
        spent_percentage=pct,
        note=reserve.note,
    )


# ── CRUD básico ───────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=Category_Reserve_Schema_Response,
    status_code=status.HTTP_201_CREATED,
)
def create(
    data: Category_Reserve_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Valida categoria
    category = db.get(Transaction_Category, data.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category with id {data.category_id} not found",
        )

    # Garante que não existe caixinha duplicada para a mesma categoria
    existing = repository.get_by_category_and_user(db, data.category_id, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A reserve for category {data.category_id} already exists. Use PATCH to update it.",
        )

    payload = data.model_dump()
    payload["user_id"] = current_user.id

    return repository.create(db, payload)


@router.get(
    "/",
    response_model=List[Category_Reserve_Schema_Response],
    status_code=status.HTTP_200_OK,
)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get(
    "/summary",
    response_model=Reserve_Summary_Schema,
    status_code=status.HTTP_200_OK,
)
def get_summary(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o resumo completo das caixinhas:
    - Quanto está reservado por categoria
    - Quanto já foi gasto no mês
    - Quanto ainda está disponível
    - Saldo livre (não alocado em nenhuma caixinha)
    """
    now = datetime.utcnow()
    month = month or now.month
    year = year or now.year

    reserves = repository.get_all_by_user(db, current_user.id)

    enriched = [
        _enrich_reserve(db, r, current_user.id, month, year)
        for r in reserves
    ]

    total_reserved = sum(e.reserved_value for e in enriched)
    total_spent = sum(e.spent_value for e in enriched)
    total_available = sum(e.available_value for e in enriched)

    # Saldo total do usuário = soma de todas as transações positivas - negativas
    saldo_raw = (
        db.query(func.sum(Transaction.transaction_value))
        .filter(Transaction.user_id == current_user.id)
        .scalar()
        or 0
    )
    saldo_total = float(saldo_raw)
    free_balance = saldo_total - total_reserved

    return Reserve_Summary_Schema(
        total_reserved=total_reserved,
        total_spent=total_spent,
        total_available=total_available,
        free_balance=free_balance,
        reserves=enriched,
    )


@router.get(
    "/{id}",
    response_model=Category_Reserve_Schema_Response,
    status_code=status.HTTP_200_OK,
)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category Reserve with id {id} not found",
        )
    return obj


@router.patch(
    "/{id}",
    response_model=Category_Reserve_Schema_Response,
    status_code=status.HTTP_200_OK,
)
def update(
    id: int,
    data: Category_Reserve_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category Reserve with id {id} not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    return repository.update(db, obj, update_data)


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
            detail=f"Category Reserve with id {id} not found",
        )
    repository.delete(db, obj)