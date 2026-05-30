from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.automation_rule_schema import (
    Automation_Rule_Schema_Create,
    Automation_Rule_Schema_Update,
    Automation_Rule_Schema_Response,
)
from app.repositories.automation_rule_repository import Automation_Rule_Repository

router = APIRouter(prefix="/automation_rule", tags=["automation_rule"])
repository = Automation_Rule_Repository()


@router.post("/", response_model=Automation_Rule_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Automation_Rule_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    payload["user_id"] = current_user.id

    return repository.create(db, payload)


@router.get("/", response_model=List[Automation_Rule_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/active", response_model=List[Automation_Rule_Schema_Response], status_code=status.HTTP_200_OK)
def get_active(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_active_by_user(db, current_user.id)


@router.get("/{id}", response_model=Automation_Rule_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation Rule with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Automation_Rule_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Automation_Rule_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation Rule with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    return repository.update(db, obj, update_data)


@router.post("/{id}/execute", response_model=Automation_Rule_Schema_Response, status_code=status.HTTP_200_OK)
def register_execution(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra a última execução de uma regra de automação."""
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation Rule with id {id} not found"
        )

    return repository.update(db, obj, {"last_execution": datetime.utcnow()})


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
            detail=f"Automation Rule with id {id} not found"
        )

    repository.delete(db, obj)
