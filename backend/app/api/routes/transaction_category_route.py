from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from app.database.session import get_db
from app.schemas.transaction_category_schema import *
from app.repositories.transaction_category_repository import Transaction_Category_Repository

router = APIRouter(prefix="/transaction_category", tags=["transaction_category"])
repository = Transaction_Category_Repository()

@router.post("/",response_model=Transaction_Category_Schema_Response,status_code=status.HTTP_201_CREATED)
def create(data:Transaction_Category_Schema_Create, db:Session = Depends(get_db)):
    return repository.create(db, data.model_dump())

@router.get("/", response_model=List[Transaction_Category_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(db:Session = Depends(get_db)):
    return repository.get_all(db)

@router.get("/{id}", response_model=Transaction_Category_Schema_Response, status_code=status.HTTP_302_FOUND)
def get_by_id(id: int, db:Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category whith code: {id} not found!"
        )
    
    return obj

@router.patch("/{id}", response_model=Transaction_Category_Schema_Response, status_code=status.HTTP_200_OK)
def update(id:int, data:Transaction_Category_Schema_Update, db:Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category whith code: {id} not found!"
        )
    
    update_data = data.model_dump(exclude_unset=None)

    return repository.get_by_id(db, id)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)
 
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction Category whith code: {id} not found!"

        )
 
    repository.delete(db, obj)