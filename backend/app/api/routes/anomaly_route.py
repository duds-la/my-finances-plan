from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction_category import Transaction_Category
from app.schemas.anomaly_schema import (
    Anomaly_Schema_Create,
    Anomaly_Schema_Update,
    Anomaly_Schema_Response,
)
from app.repositories.anomaly_repository import Anomaly_Repository

router = APIRouter(prefix="/anomaly", tags=["anomaly"])
repository = Anomaly_Repository()


@router.post("/", response_model=Anomaly_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Anomaly_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.category_id:
        category = db.get(Transaction_Category, data.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction Category with id {data.category_id} not found"
            )

    payload = data.model_dump()
    payload["user_id"] = current_user.id

    return repository.create(db, payload)


@router.get("/", response_model=List[Anomaly_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/filter/status", response_model=List[Anomaly_Schema_Response], status_code=status.HTTP_200_OK)
def get_by_status(
    status_filter: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_by_status(db, current_user.id, status_filter)


@router.get("/filter/category/{category_id}", response_model=List[Anomaly_Schema_Response], status_code=status.HTTP_200_OK)
def get_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_by_category(db, current_user.id, category_id)


@router.get("/{id}", response_model=Anomaly_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Anomaly_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Anomaly_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id_and_user(db, id, current_user.id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "category_id" in update_data and update_data["category_id"]:
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
            detail=f"Anomaly with id {id} not found"
        )

    repository.delete(db, obj)
