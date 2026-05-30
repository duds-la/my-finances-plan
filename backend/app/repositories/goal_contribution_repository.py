from sqlalchemy.orm import Session
from app.models.goal_contribution import Goal_Contribution
from app.repositories.base_repository import Base_Repository


class Goal_Contribution_Repository(Base_Repository[Goal_Contribution]):

    def __init__(self):
        super().__init__(Goal_Contribution)

    def get_all_by_goal(self, db: Session, goal_id: int):
        return (
            db.query(Goal_Contribution)
            .filter(Goal_Contribution.goal_id == goal_id)
            .all()
        )
