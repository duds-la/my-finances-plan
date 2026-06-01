from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.schemas.transaction_category_schema import (
    Transaction_Category_Schema_Create,
    Transaction_Category_Schema_Update,
    Transaction_Category_Schema_Response,
)
from app.repositories.transaction_category_repository import Transaction_Category_Repository

router = APIRouter(prefix="/transaction_category", tags=["transaction_category"])
repository = Transaction_Category_Repository()


@router.post("/", response_model=Transaction_Category_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(data: Transaction_Category_Schema_Create, db: Session = Depends(get_db)):
    return repository.create(db, data.model_dump())


@router.get("/", response_model=List[Transaction_Category_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(db: Session = Depends(get_db)):
    return repository.get_all(db)


@router.get("/{id}", response_model=Transaction_Category_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Transaction_Category_Schema_Response, status_code=status.HTTP_200_OK)
def update(id: int, data: Transaction_Category_Schema_Update, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(obj, field, value)

    db.commit()
    db.refresh(obj)

    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category with id {id} not found"
        )

    repository.delete(db, obj)