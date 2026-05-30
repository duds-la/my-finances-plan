from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.schemas.achievement_schema import (
    Achievement_Schema_Create,
    Achievement_Schema_Update,
    Achievement_Schema_Response,
)
from app.repositories.achievement_repository import Achievement_Repository

router = APIRouter(prefix="/achievement", tags=["achievement"])
repository = Achievement_Repository()


@router.post("/", response_model=Achievement_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(data: Achievement_Schema_Create, db: Session = Depends(get_db)):
    existing = repository.get_by_code(db, data.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Achievement with code '{data.code}' already exists"
        )

    return repository.create(db, data.model_dump())


@router.get("/", response_model=List[Achievement_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(db: Session = Depends(get_db)):
    return repository.get_all(db)


@router.get("/{id}", response_model=Achievement_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Achievement_Schema_Response, status_code=status.HTTP_200_OK)
def update(id: int, data: Achievement_Schema_Update, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    return repository.update(db, obj, update_data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {id} not found"
        )

    repository.delete(db, obj)
