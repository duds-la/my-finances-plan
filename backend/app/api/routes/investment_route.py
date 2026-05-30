from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.investment_type import Investment_Type
from app.schemas.investment_schema import (
    Investment_Schema_Create,
    Investment_Schema_Update,
    Investment_Schema_Response,
)
from app.repositories.investment_repository import Investment_Repository

router = APIRouter(prefix="/investment", tags=["investment"])
repository = Investment_Repository()


@router.post("/", response_model=Investment_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Investment_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    investment_type = db.get(Investment_Type, data.investment_type_id)
    if not investment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment Type with id {data.investment_type_id} not found"
        )

    payload = data.model_dump()
    payload["user_id"] = current_user.id

    return repository.create(db, payload)


@router.get("/", response_model=List[Investment_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/{id}", response_model=Investment_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment with id {id} not found"
        )

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "investment_type_id" in update_data:
        investment_type = db.get(Investment_Type, update_data["investment_type_id"])
        if not investment_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investment Type with id {update_data['investment_type_id']} not found"
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
            detail=f"Investment with id {id} not found"
        )

    repository.delete(db, obj)