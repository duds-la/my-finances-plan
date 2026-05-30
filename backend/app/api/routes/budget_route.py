from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction_category import Transaction_Category
from app.schemas.budget_schema import (
    Budget_Schema_Create,
    Budget_Schema_Update,
    Budget_Schema_Response,
)
from app.repositories.budget_repository import Budget_Repository

router = APIRouter(prefix="/budget", tags=["budget"])
repository = Budget_Repository()


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

    return repository.create(db, payload)


@router.get("/", response_model=List[Budget_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/filter", response_model=List[Budget_Schema_Response], status_code=status.HTTP_200_OK)
def get_by_month_year(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_by_month_year(db, current_user.id, month, year)


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

    return obj


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
            detail=f"Budget with id {id} not found"
        )

    repository.delete(db, obj)
