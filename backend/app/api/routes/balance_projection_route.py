from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.balance_projection_schema import (
    Balance_Projection_Schema_Create,
    Balance_Projection_Schema_Update,
    Balance_Projection_Schema_Response,
)
from app.repositories.balance_projection_repository import Balance_Projection_Repository

router = APIRouter(prefix="/balance_projection", tags=["balance_projection"])
repository = Balance_Projection_Repository()


@router.post("/", response_model=Balance_Projection_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Balance_Projection_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    payload["user_id"] = current_user.id

    return repository.create(db, payload)


@router.get("/", response_model=List[Balance_Projection_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/filter", response_model=Balance_Projection_Schema_Response, status_code=status.HTTP_200_OK)
def get_latest_by_period(
    period_days: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_latest_by_period(db, current_user.id, period_days)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Balance Projection for {period_days} days not found"
        )

    return obj


@router.get("/{id}", response_model=Balance_Projection_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Balance Projection with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Balance_Projection_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Balance_Projection_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Balance Projection with id {id} not found"
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
            detail=f"Balance Projection with id {id} not found"
        )

    repository.delete(db, obj)
