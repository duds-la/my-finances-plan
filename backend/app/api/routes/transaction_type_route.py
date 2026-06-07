from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.schemas.transaction_type import (
    Transaction_Type_Create,
    Transaction_Type_Update,
    Transaction_Type_Response
)
from app.repositories.transaction_type_repository import Transaction_Type_Repository

router = APIRouter(prefix="/transaction_type", tags=["transaction_type"])
repository = Transaction_Type_Repository()

# IDs dos tipos de sistema que não podem ser editados ou excluídos
PROTECTED_TYPE_IDS = {7, 8, 9}


@router.post("/", response_model=Transaction_Type_Response, status_code=status.HTTP_201_CREATED)
def create(data: Transaction_Type_Create, db: Session = Depends(get_db)):
    return repository.create(db, data.model_dump())


@router.get("/", response_model=List[Transaction_Type_Response])
def get_all(db: Session = Depends(get_db)):
    return repository.get_all(db)


@router.get("/{id}", response_model=Transaction_Type_Response)
def get_by_id(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Type with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Transaction_Type_Response)
def update(id: int, data: Transaction_Type_Update, db: Session = Depends(get_db)):
    if id in PROTECTED_TYPE_IDS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este tipo de transação é do sistema e não pode ser editado."
        )

    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Type with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(obj, field, value)

    db.commit()
    db.refresh(obj)

    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db)):
    if id in PROTECTED_TYPE_IDS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este tipo de transação é do sistema e não pode ser excluído."
        )

    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Type with id {id} not found"
        )

    repository.delete(db, obj)