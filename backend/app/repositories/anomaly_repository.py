from sqlalchemy.orm import Session
from app.models.anomaly import Anomaly
from app.repositories.base_repository import Base_Repository


class Anomaly_Repository(Base_Repository[Anomaly]):

    def __init__(self):
        super().__init__(Anomaly)

    def get_all_by_user(self, db: Session, user_id: int):
        return (
            db.query(Anomaly)
            .filter(Anomaly.user_id == user_id)
            .order_by(Anomaly.detected_at.desc())
            .all()
        )

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Anomaly)
            .filter(Anomaly.id == id, Anomaly.user_id == user_id)
            .first()
        )

    def get_by_status(self, db: Session, user_id: int, status: str):
        return (
            db.query(Anomaly)
            .filter(Anomaly.user_id == user_id, Anomaly.status == status)
            .order_by(Anomaly.detected_at.desc())
            .all()
        )

    def get_by_category(self, db: Session, user_id: int, category_id: int):
        return (
            db.query(Anomaly)
            .filter(Anomaly.user_id == user_id, Anomaly.category_id == category_id)
            .order_by(Anomaly.detected_at.desc())
            .all()
        )