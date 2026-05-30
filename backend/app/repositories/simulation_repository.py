from sqlalchemy.orm import Session
from app.models.simulation import Simulation
from app.repositories.base_repository import Base_Repository


class Simulation_Repository(Base_Repository[Simulation]):

    def __init__(self):
        super().__init__(Simulation)

    def get_all_by_user(self, db: Session, user_id: int):
        return db.query(Simulation).filter(Simulation.user_id == user_id).all()

    def get_by_id_and_user(self, db: Session, id: int, user_id: int):
        return (
            db.query(Simulation)
            .filter(Simulation.id == id, Simulation.user_id == user_id)
            .first()
        )

    def get_by_type(self, db: Session, user_id: int, simulation_type: str):
        return (
            db.query(Simulation)
            .filter(
                Simulation.user_id == user_id,
                Simulation.simulation_type == simulation_type,
            )
            .all()
        )
