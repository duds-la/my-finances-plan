from sqlalchemy.orm import Session
from app.models.achievement import Achievement
from app.repositories.base_repository import Base_Repository


class Achievement_Repository(Base_Repository[Achievement]):

    def __init__(self):
        super().__init__(Achievement)

    def get_by_code(self, db: Session, code: str):
        return db.query(Achievement).filter(Achievement.code == code).first()
