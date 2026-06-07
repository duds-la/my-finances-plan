from sqlalchemy.orm import Session
from app.models.category_reserve import Category_Reserve
from app.repositories.base_repository import Base_Repository


class Category_Reserve_Repository(Base_Repository[Category_Reserve]):

    def __init__(self):
        super().__init__(Category_Reserve)

    def get_all_by_user(self, db: Session, user_id: int):
        return (
            db.query(Category_Reserve)
            .filter(Category_Reserve.user_id == user_id)
            .all()
        )

    def get_by_month_year(self, db: Session, user_id: int, month: int, year: int):
        return (
            db.query(Category_Reserve)
            .filter(
                Category_Reserve.user_id == user_id,
                Category_Reserve.month == month,
                Category_Reserve.year  == year,
            )
            .all()
        )

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Category_Reserve)
            .filter(Category_Reserve.id == id, Category_Reserve.user_id == user_id)
            .first()
        )

    def get_by_category_month_year(
        self, db: Session, user_id: int, category_id: int, month: int, year: int
    ):
        """Unicidade: uma caixinha por (user, category, month, year)."""
        return (
            db.query(Category_Reserve)
            .filter(
                Category_Reserve.user_id     == user_id,
                Category_Reserve.category_id == category_id,
                Category_Reserve.month       == month,
                Category_Reserve.year        == year,
            )
            .first()
        )