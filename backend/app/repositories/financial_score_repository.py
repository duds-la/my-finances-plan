from sqlalchemy.orm import Session
from app.models.financial_score import Financial_Score
from app.repositories.base_repository import Base_Repository


class Financial_Score_Repository(Base_Repository[Financial_Score]):

    def __init__(self):
        super().__init__(Financial_Score)

    def get_all_by_user(self, db: Session, user_id: int):
        return (
            db.query(Financial_Score)
            .filter(Financial_Score.user_id == user_id)
            .order_by(Financial_Score.year.desc(), Financial_Score.month.desc())
            .all()
        )

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Financial_Score)
            .filter(Financial_Score.id == id, Financial_Score.user_id == user_id)
            .first()
        )

    def get_by_month_year(self, db: Session, user_id: int, month: int, year: int):
        return (
            db.query(Financial_Score)
            .filter(
                Financial_Score.user_id == user_id,
                Financial_Score.month == month,
                Financial_Score.year == year,
            )
            .first()
        )