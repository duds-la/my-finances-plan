from sqlalchemy.orm import Session
from app.models.user_achievement import User_Achievement
from app.repositories.base_repository import Base_Repository


class User_Achievement_Repository(Base_Repository[User_Achievement]):

    def __init__(self):
        super().__init__(User_Achievement)

    def get_all_by_user(self, db: Session, user_id: int):
        return (
            db.query(User_Achievement)
            .filter(User_Achievement.user_id == user_id)
            .all()
        )

    def get_by_user_and_achievement(self, db: Session, user_id: int, achievement_id: int):
        return (
            db.query(User_Achievement)
            .filter(
                User_Achievement.user_id == user_id,
                User_Achievement.achievement_id == achievement_id,
            )
            .first()
        )
