from sqlalchemy.orm import Session
from app.models.financial_goal import Financial_Goal
from app.repositories.base_repository import Base_Repository


class Financial_Goal_Repository(Base_Repository[Financial_Goal]):

    def __init__(self):
        super().__init__(Financial_Goal)

    def get_all_by_user(self, db: Session, user_id: int):
        return db.query(Financial_Goal).filter(Financial_Goal.user_id == user_id).all()

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Financial_Goal)
            .filter(Financial_Goal.id == id, Financial_Goal.user_id == user_id)
            .first()
        )

    def get_by_status(self, db: Session, user_id: int, status: str):
        return (
            db.query(Financial_Goal)
            .filter(Financial_Goal.user_id == user_id, Financial_Goal.status == status)
            .all()
        )
