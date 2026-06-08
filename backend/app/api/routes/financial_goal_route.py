from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.goal_contribution import Goal_Contribution
from app.schemas.financial_goal_schema import (
    Financial_Goal_Schema_Create,
    Financial_Goal_Schema_Update,
    Financial_Goal_Schema_Response,
)
from app.repositories.financial_goal_repository import Financial_Goal_Repository

router = APIRouter(prefix="/financial_goal", tags=["financial_goal"])
repository = Financial_Goal_Repository()


@router.post("/", response_model=Financial_Goal_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Financial_Goal_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    payload["user_id"] = current_user.id
    return repository.create(db, payload)


@router.get("/", response_model=List[Financial_Goal_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/filter", response_model=List[Financial_Goal_Schema_Response], status_code=status.HTTP_200_OK)
def get_by_status(
    status_filter: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_by_status(db, current_user.id, status_filter)


@router.get("/{id}", response_model=Financial_Goal_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial Goal with id {id} not found",
        )
    return obj


@router.patch("/{id}", response_model=Financial_Goal_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Financial_Goal_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial Goal with id {id} not found",
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
            detail=f"Financial Goal with id {id} not found",
        )

    # Remove contribuições vinculadas antes de excluir a meta
    # (FK não tem ON DELETE CASCADE)
    db.query(Goal_Contribution).filter(Goal_Contribution.goal_id == id).delete()
    db.flush()

    repository.delete(db, obj)