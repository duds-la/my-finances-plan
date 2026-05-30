from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.investment_composition_schema import (
    Investment_Composition_Schema_Create,
    Investment_Composition_Schema_Update,
    Investment_Composition_Schema_Response,
)
from app.repositories.investment_composition_repository import Investment_Composition_Repository
from app.repositories.investment_repository import Investment_Repository

router = APIRouter(prefix="/investment_composition", tags=["investment_composition"])
repository = Investment_Composition_Repository()
investment_repository = Investment_Repository()


@router.post("/", response_model=Investment_Composition_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Investment_Composition_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    investment = investment_repository.get_by_id_and_user(db, data.investment_id, current_user.id)
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment with id {data.investment_id} not found"
        )

    return repository.create(db, data.model_dump())


@router.get("/investment/{investment_id}", response_model=List[Investment_Composition_Schema_Response], status_code=status.HTTP_200_OK)
def get_all_by_investment(
    investment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    investment = investment_repository.get_by_id_and_user(db, investment_id, current_user.id)
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment with id {investment_id} not found"
        )

    return repository.get_all_by_investment(db, investment_id)


@router.get("/{id}", response_model=Investment_Composition_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment Composition with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Investment_Composition_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Investment_Composition_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment Composition with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "investment_id" in update_data:
        investment = investment_repository.get_by_id_and_user(db, update_data["investment_id"], current_user.id)
        if not investment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investment with id {update_data['investment_id']} not found"
            )

    return repository.update(db, obj, update_data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment Composition with id {id} not found"
        )

    repository.delete(db, obj)