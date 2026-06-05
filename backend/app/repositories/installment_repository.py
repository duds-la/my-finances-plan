from sqlalchemy.orm import Session
from app.models.installment_plan import Installment_Plan
from app.models.installment import Installment
from app.repositories.base_repository import Base_Repository


class Installment_Plan_Repository(Base_Repository[Installment_Plan]):

    def __init__(self):
        super().__init__(Installment_Plan)

    def get_all_by_user(self, db: Session, user_id: int):
        return (
            db.query(Installment_Plan)
            .filter(Installment_Plan.user_id == user_id)
            .order_by(Installment_Plan.created_at.desc())
            .all()
        )

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Installment_Plan)
            .filter(Installment_Plan.id == id, Installment_Plan.user_id == user_id)
            .first()
        )

    def get_active_by_user(self, db: Session, user_id: int):
        return (
            db.query(Installment_Plan)
            .filter(Installment_Plan.user_id == user_id, Installment_Plan.status == "active")
            .all()
        )


class Installment_Repository(Base_Repository[Installment]):

    def __init__(self):
        super().__init__(Installment)

    def get_by_plan(self, db: Session, plan_id: int):
        return (
            db.query(Installment)
            .filter(Installment.plan_id == plan_id)
            .order_by(Installment.installment_number)
            .all()
        )

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Installment)
            .filter(Installment.id == id, Installment.user_id == user_id)
            .first()
        )

    def get_pending_by_user(self, db: Session, user_id: int):
        """Todas as parcelas pendentes, ordenadas por vencimento."""
        return (
            db.query(Installment)
            .filter(Installment.user_id == user_id, Installment.status == "pending")
            .order_by(Installment.due_date)
            .all()
        )
