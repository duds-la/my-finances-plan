from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.financial_score_schema import (
    Financial_Score_Schema_Create,
    Financial_Score_Schema_Update,
    Financial_Score_Schema_Response,
)
from app.repositories.financial_score_repository import Financial_Score_Repository

router = APIRouter(prefix="/financial_score", tags=["financial_score"])
repository = Financial_Score_Repository()


@router.post("/", response_model=Financial_Score_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Financial_Score_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    payload["user_id"] = current_user.id

    return repository.create(db, payload)


@router.get("/", response_model=List[Financial_Score_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/filter", response_model=Financial_Score_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_month_year(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_month_year(db, current_user.id, month, year)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial Score for {month}/{year} not found"
        )

    return obj


@router.get("/{id}", response_model=Financial_Score_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial Score with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Financial_Score_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Financial_Score_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial Score with id {id} not found"
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
            detail=f"Financial Score with id {id} not found"
        )

    repository.delete(db, obj)
