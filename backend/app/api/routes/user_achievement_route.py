from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.achievement import Achievement
from app.schemas.user_achievement_schema import (
    User_Achievement_Schema_Create,
    User_Achievement_Schema_Response,
)
from app.repositories.user_achievement_repository import User_Achievement_Repository
from app.repositories.achievement_repository import Achievement_Repository

router = APIRouter(prefix="/user_achievement", tags=["user_achievement"])
repository = User_Achievement_Repository()
achievement_repository = Achievement_Repository()


@router.post("/", response_model=User_Achievement_Schema_Response, status_code=status.HTTP_201_CREATED)
def unlock(
    data: User_Achievement_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    achievement = achievement_repository.get_by_id(db, data.achievement_id)
    if not achievement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {data.achievement_id} not found"
        )

    already_unlocked = repository.get_by_user_and_achievement(
        db, current_user.id, data.achievement_id
    )
    if already_unlocked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Achievement with id {data.achievement_id} already unlocked"
        )

    payload = data.model_dump()
    payload["user_id"] = current_user.id

    return repository.create(db, payload)


@router.get("/", response_model=List[User_Achievement_Schema_Response], status_code=status.HTTP_200_OK)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_all_by_user(db, current_user.id)


@router.get("/{id}", response_model=User_Achievement_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User Achievement with id {id} not found"
        )

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
            detail=f"User Achievement with id {id} not found"
        )

    repository.delete(db, obj)
