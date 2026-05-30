from sqlalchemy.orm import Session
from app.models.investment_composition import Investment_Composition
from app.repositories.base_repository import Base_Repository


class Investment_Composition_Repository(Base_Repository[Investment_Composition]):

    def __init__(self):
        super().__init__(Investment_Composition)

    def get_all_by_investment(self, db: Session, investment_id: int):
        return (
            db.query(Investment_Composition)
            .filter(Investment_Composition.investment_id == investment_id)
            .all()
        )