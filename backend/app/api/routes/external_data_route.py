from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.schemas.external_data_schema import (
    External_Data_Schema_Create,
    External_Data_Schema_Update,
    External_Data_Schema_Response,
)
from app.repositories.external_data_repository import External_Data_Repository

router = APIRouter(prefix="/external_data", tags=["external_data"])
repository = External_Data_Repository()


@router.post("/", response_model=External_Data_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(data: External_Data_Schema_Create, db: Session = Depends(get_db)):
    return repository.create(db, data.model_dump())


@router.get("/", response_model=List[External_Data_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(db: Session = Depends(get_db)):
    return repository.get_all(db)


@router.get("/filter/indicator", response_model=List[External_Data_Schema_Response], status_code=status.HTTP_200_OK)
def get_by_indicator(indicator: str, db: Session = Depends(get_db)):
    return repository.get_by_indicator(db, indicator)


@router.get("/filter/latest", response_model=External_Data_Schema_Response, status_code=status.HTTP_200_OK)
def get_latest_by_indicator(indicator: str, db: Session = Depends(get_db)):
    obj = repository.get_latest_by_indicator(db, indicator)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"External Data for indicator '{indicator}' not found"
        )

    return obj


@router.get("/filter/source", response_model=List[External_Data_Schema_Response], status_code=status.HTTP_200_OK)
def get_by_source_and_indicator(
    source: str,
    indicator: str,
    db: Session = Depends(get_db),
):
    return repository.get_by_source_and_indicator(db, source, indicator)


@router.get("/{id}", response_model=External_Data_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"External Data with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=External_Data_Schema_Response, status_code=status.HTTP_200_OK)
def update(id: int, data: External_Data_Schema_Update, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"External Data with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    return repository.update(db, obj, update_data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db)):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"External Data with id {id} not found"
        )

    repository.delete(db, obj)
