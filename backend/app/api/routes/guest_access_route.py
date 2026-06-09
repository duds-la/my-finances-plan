from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.guest_access import Guest_Access
from app.models.financial_goal import Financial_Goal
from app.models.investment import Investment
from app.schemas.guest_access_schema import (
    Guest_Access_Schema_Create,
    Guest_Access_Schema_Update,
    Guest_Access_Schema_Response,
)
from app.schemas.financial_goal_schema import Financial_Goal_Schema_Response
from app.schemas.investment_schema import Investment_Schema_Response
from app.repositories.guest_access_repository import Guest_Access_Repository
from app.core.security import get_password_hash as hash_password

router = APIRouter(prefix="/guest_access", tags=["guest_access"])
repository = Guest_Access_Repository()


# ── CRUD (dono gerencia seus convidados) ──────────────────────────────────────

@router.post("/", response_model=Guest_Access_Schema_Response, status_code=status.HTTP_201_CREATED)
def create_guest(
    data: Guest_Access_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um usuário convidado e vincula ao dono com permissões."""
    # Garante que o nome não está em uso
    existing = db.query(User).filter(User.name == data.guest_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nome de usuário já existe")

    # Cria o User convidado
    guest_user = User(
        name=data.guest_name,
        password=hash_password(data.guest_password),
        is_guest=True,
    )
    db.add(guest_user)
    db.flush()

    # Valida que os IDs de metas pertencem ao dono
    for goal_id in data.shared_goal_ids:
        goal = db.query(Financial_Goal).filter(
            Financial_Goal.id == goal_id,
            Financial_Goal.user_id == current_user.id,
        ).first()
        if not goal:
            raise HTTPException(
                status_code=404,
                detail=f"Meta {goal_id} não encontrada ou não pertence a você",
            )

    # Valida que os IDs de investimentos pertencem ao dono
    for inv_id in data.shared_investment_ids:
        inv = db.query(Investment).filter(
            Investment.id == inv_id,
            Investment.user_id == current_user.id,
        ).first()
        if not inv:
            raise HTTPException(
                status_code=404,
                detail=f"Investimento {inv_id} não encontrado ou não pertence a você",
            )

    access = Guest_Access(
        owner_id=current_user.id,
        guest_id=guest_user.id,
        allowed_modules=data.allowed_modules,
        shared_goal_ids=data.shared_goal_ids,
        shared_investment_ids=data.shared_investment_ids,
    )
    db.add(access)
    db.commit()
    db.refresh(access)
    return access


@router.get("/", response_model=List[Guest_Access_Schema_Response], status_code=status.HTTP_200_OK)
def list_guests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os convidados do dono autenticado."""
    _require_not_guest(current_user)
    return repository.get_all_by_owner(db, current_user.id)


@router.patch("/{id}", response_model=Guest_Access_Schema_Response, status_code=status.HTTP_200_OK)
def update_guest(
    id: int,
    data: Guest_Access_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza permissões / senha de um convidado."""
    _require_not_guest(current_user)

    access = repository.get_by_id_and_owner(db, id, current_user.id)
    if not access:
        raise HTTPException(status_code=404, detail="Acesso de convidado não encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Troca senha do convidado separadamente
    if "guest_password" in update_data:
        guest_user = db.get(User, access.guest_id)
        if guest_user:
            guest_user.password = hash_password(update_data.pop("guest_password"))
        else:
            update_data.pop("guest_password")

    access = repository.update(db, access, update_data)
    return access


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove o convidado (deleta o User convidado também, por CASCADE)."""
    _require_not_guest(current_user)

    access = repository.get_by_id_and_owner(db, id, current_user.id)
    if not access:
        raise HTTPException(status_code=404, detail="Acesso de convidado não encontrado")

    guest_user = db.get(User, access.guest_id)
    if guest_user:
        db.delete(guest_user)   # CASCADE deleta guest_access também
    else:
        repository.delete(db, access)


# ── Endpoints para o convidado (lê dados do dono) ────────────────────────────

@router.get("/shared/metas", response_model=List[Financial_Goal_Schema_Response])
def get_shared_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Para usuários convidados: retorna as metas compartilhadas pelo dono.
    """
    access = _get_guest_access(db, current_user)

    if "metas" not in (access.allowed_modules or []):
        raise HTTPException(status_code=403, detail="Acesso a metas não permitido")

    ids = access.shared_goal_ids or []
    if not ids:
        return []

    return db.query(Financial_Goal).filter(Financial_Goal.id.in_(ids)).all()


@router.get("/shared/investimentos", response_model=List[Investment_Schema_Response])
def get_shared_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Para usuários convidados: retorna os investimentos compartilhados pelo dono.
    """
    access = _get_guest_access(db, current_user)

    if "investimentos" not in (access.allowed_modules or []):
        raise HTTPException(status_code=403, detail="Acesso a investimentos não permitido")

    ids = access.shared_investment_ids or []
    if not ids:
        return []

    return db.query(Investment).filter(Investment.id.in_(ids)).all()


@router.get("/my-access")
def get_my_access(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Para convidados: retorna as próprias permissões (módulos e IDs liberados).
    Usado pelo frontend para montar a navegação.
    """
    if not getattr(current_user, "is_guest", False):
        raise HTTPException(status_code=403, detail="Endpoint exclusivo para convidados")

    access = repository.get_by_guest(db, current_user.id)
    if not access:
        raise HTTPException(status_code=404, detail="Acesso de convidado não encontrado")

    return {
        "allowed_modules":       access.allowed_modules or [],
        "shared_goal_ids":       access.shared_goal_ids or [],
        "shared_investment_ids": access.shared_investment_ids or [],
        "owner_id":              access.owner_id,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_not_guest(user: User):
    if getattr(user, "is_guest", False):
        raise HTTPException(status_code=403, detail="Convidados não podem gerenciar acessos")


def _get_guest_access(db: Session, user: User) -> Guest_Access:
    if not getattr(user, "is_guest", False):
        raise HTTPException(status_code=403, detail="Endpoint exclusivo para convidados")

    access = Guest_Access_Repository().get_by_guest(db, user.id)
    if not access or not access.is_active:
        raise HTTPException(status_code=403, detail="Acesso de convidado inativo ou não encontrado")

    return access
