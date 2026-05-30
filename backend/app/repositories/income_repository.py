from sqlalchemy.orm import Session
from app.models.income import Income
from app.repositories.base_repository import Base_Repository


class Income_Repository(Base_Repository[Income]):

    def __init__(self):
        super().__init__(Income)

    def get_all_by_investment(self, db: Session, investment_id: int):
        return db.query(Income).filter(Income.investment_id == investment_id).all()