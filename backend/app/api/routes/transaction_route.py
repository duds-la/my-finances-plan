from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
 
from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction_type import Transaction_Type
from app.models.transaction_category import Transaction_Category
from app.schemas.transaction_schema import (
    Transaction_Schema_Create,
    Transaction_Schema_Update,
    Transaction_Schema_Response,
)
from app.repositories.transaction_repository import Transaction_Repository
 
router = APIRouter(prefix="/transaction", tags=["transaction"])
repository = Transaction_Repository()
 
 
@router.post("/", response_model=Transaction_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Transaction_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction_type = db.get(Transaction_Type, data.transaction_type_id)
    if not transaction_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Type with id {data.transaction_type_id} not found",
        )
 
    transaction_category = db.get(Transaction_Category, data.transaction_category_id)
    if not transaction_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category with id {data.transaction_category_id} not found",
        )
 
    payload = data.model_dump()
    payload["user_id"] = current_user.id
 
    return repository.create(db, payload)
 
 
@router.get("/", response_model=List[Transaction_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all(db)
 
 
@router.get("/{id}", response_model=Transaction_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)
 
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with id {id} not found",
        )
 
    return obj
 
 
@router.patch("/{id}", response_model=Transaction_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Transaction_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)
 
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with id {id} not found",
        )
 
    update_data = data.model_dump(exclude_unset=True)
 
    # Valida transaction_type_id se foi enviado
    if "transaction_type_id" in update_data:
        transaction_type = db.get(Transaction_Type, update_data["transaction_type_id"])
        if not transaction_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction Type with id {update_data['transaction_type_id']} not found",
            )
 
    # Valida transaction_category_id se foi enviado
    if "transaction_category_id" in update_data:
        transaction_category = db.get(Transaction_Category, update_data["transaction_category_id"])
        if not transaction_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction Category with id {update_data['transaction_category_id']} not found",
            )
 
    for field, value in update_data.items():
        setattr(obj, field, value)
 
    db.commit()
    db.refresh(obj)
 
    return obj
 
 
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
            detail=f"Transaction with id {id} not found",
        )
 
    repository.delete(db, obj)