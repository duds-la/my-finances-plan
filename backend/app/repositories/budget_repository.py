from sqlalchemy.orm import Session
from app.models.budget import Budget
from app.repositories.base_repository import Base_Repository


class Budget_Repository(Base_Repository[Budget]):

    def __init__(self):
        super().__init__(Budget)

    def get_all_by_user(self, db: Session, user_id: int):
        return db.query(Budget).filter(Budget.user_id == user_id).all()

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Budget)
            .filter(Budget.id == id, Budget.user_id == user_id)
            .first()
        )

    def get_by_month_year(self, db: Session, user_id: int, month: int, year: int):
        return (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.month == month,
                Budget.year == year,
            )
            .all()
        )
