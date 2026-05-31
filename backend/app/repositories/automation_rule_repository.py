from sqlalchemy.orm import Session
from app.models.automation_rule import Automation_Rule
from app.repositories.base_repository import Base_Repository


class Automation_Rule_Repository(Base_Repository[Automation_Rule]):

    def __init__(self):
        super().__init__(Automation_Rule)

    def get_all_by_user(self, db: Session, user_id: int):
        return (
            db.query(Automation_Rule)
            .filter(Automation_Rule.user_id == user_id)
            .all()
        )

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Automation_Rule)
            .filter(Automation_Rule.id == id, Automation_Rule.user_id == user_id)
            .first()
        )

    def get_active_by_user(self, db: Session, user_id: int):
        return (
            db.query(Automation_Rule)
            .filter(
                Automation_Rule.user_id == user_id,
                Automation_Rule.is_active == True,
            )
            .all()
        )