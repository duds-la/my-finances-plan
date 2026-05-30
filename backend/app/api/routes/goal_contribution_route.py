from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.goal_contribution_schema import (
    Goal_Contribution_Schema_Create,
    Goal_Contribution_Schema_Update,
    Goal_Contribution_Schema_Response,
)
from app.repositories.goal_contribution_repository import Goal_Contribution_Repository
from app.repositories.financial_goal_repository import Financial_Goal_Repository

router = APIRouter(prefix="/goal_contribution", tags=["goal_contribution"])
repository = Goal_Contribution_Repository()
goal_repository = Financial_Goal_Repository()


@router.post("/", response_model=Goal_Contribution_Schema_Response, status_code=status.HTTP_201_CREATED)
def create(
    data: Goal_Contribution_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = goal_repository.get_by_id_and_user(db, data.goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial Goal with id {data.goal_id} not found"
        )

    contribution = repository.create(db, data.model_dump())

    # Atualiza o valor atual da meta automaticamente
    goal.current_value = (goal.current_value or 0) + data.value
    if goal.current_value >= goal.target_value:
        goal.status = "concluida"
    db.commit()
    db.refresh(goal)

    return contribution


@router.get("/goal/{goal_id}", response_model=List[Goal_Contribution_Schema_Response], status_code=status.HTTP_200_OK)
def get_all_by_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = goal_repository.get_by_id_and_user(db, goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial Goal with id {goal_id} not found"
        )

    return repository.get_all_by_goal(db, goal_id)


@router.get("/{id}", response_model=Goal_Contribution_Schema_Response, status_code=status.HTTP_200_OK)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal Contribution with id {id} not found"
        )

    return obj


@router.patch("/{id}", response_model=Goal_Contribution_Schema_Response, status_code=status.HTTP_200_OK)
def update(
    id: int,
    data: Goal_Contribution_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = repository.get_by_id(db, id)

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal Contribution with id {id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "goal_id" in update_data:
        goal = goal_repository.get_by_id_and_user(db, update_data["goal_id"], current_user.id)
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Financial Goal with id {update_data['goal_id']} not found"
            )

    return repository.update(db, obj, update_data)


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
            detail=f"Goal Contribution with id {id} not found"
        )

    repository.delete(db, obj)
