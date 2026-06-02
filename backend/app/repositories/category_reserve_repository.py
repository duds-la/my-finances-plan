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

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Category_Reserve)
            .filter(
                Category_Reserve.id == id,
                Category_Reserve.user_id == user_id,
            )
            .first()
        )

    def get_by_category_and_user(self, db: Session, category_id: int, user_id: int):
        """Garante unicidade: uma caixinha por categoria por usuário."""
        return (
            db.query(Category_Reserve)
            .filter(
                Category_Reserve.category_id == category_id,
                Category_Reserve.user_id == user_id,
            )
            .first()
        )