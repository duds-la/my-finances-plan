from sqlalchemy.orm import Session
from app.models.guest_access import Guest_Access
from app.repositories.base_repository import Base_Repository


class Guest_Access_Repository(Base_Repository[Guest_Access]):

    def __init__(self):
        super().__init__(Guest_Access)

    def get_all_by_owner(self, db: Session, owner_id: int):
        return (
            db.query(Guest_Access)
            .filter(Guest_Access.owner_id == owner_id)
            .all()
        )

    def get_by_guest(self, db: Session, guest_id: int) -> Guest_Access | None:
        """Retorna o acesso ativo para um usuário convidado."""
        return (
            db.query(Guest_Access)
            .filter(
                Guest_Access.guest_id == guest_id,
                Guest_Access.is_active == True,
            )
            .first()
        )

    def get_by_id_and_owner(self, db: Session, id: int, owner_id: int):
        return (
            db.query(Guest_Access)
            .filter(Guest_Access.id == id, Guest_Access.owner_id == owner_id)
            .first()
        )
