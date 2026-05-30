from sqlalchemy.orm import Session
from app.models.investment import Investment
from app.repositories.base_repository import Base_Repository


class Investment_Repository(Base_Repository[Investment]):

    def __init__(self):
        super().__init__(Investment)

    def get_all_by_user(self, db: Session, user_id: int):
        return db.query(Investment).filter(Investment.user_id == user_id).all()

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Investment)
            .filter(Investment.id == id, Investment.user_id == user_id)
            .first()
        )