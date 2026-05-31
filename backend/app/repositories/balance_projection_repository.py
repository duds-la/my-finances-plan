from sqlalchemy.orm import Session
from app.models.balance_projection import Balance_Projection
from app.repositories.base_repository import Base_Repository


class Balance_Projection_Repository(Base_Repository[Balance_Projection]):

    def __init__(self):
        super().__init__(Balance_Projection)

    def get_all_by_user(self, db: Session, user_id: int):
        return (
            db.query(Balance_Projection)
            .filter(Balance_Projection.user_id == user_id)
            .order_by(Balance_Projection.generated_at.desc())
            .all()
        )

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Balance_Projection)
            .filter(Balance_Projection.id == id, Balance_Projection.user_id == user_id)
            .first()
        )

    def get_latest_by_period(self, db: Session, user_id: int, period_days: int):
        return (
            db.query(Balance_Projection)
            .filter(
                Balance_Projection.user_id == user_id,
                Balance_Projection.period_days == period_days,
            )
            .order_by(Balance_Projection.generated_at.desc())
            .first()
        )