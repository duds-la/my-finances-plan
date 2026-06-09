from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
def read_user_me(current_user: User = Depends(get_current_user)):
    return {
        "id":           current_user.id,
        "email":        current_user.name,
        "full_name":    current_user.name,
        "is_active":    True,
        "is_superuser": False,
        "is_guest":     getattr(current_user, "is_guest", False),
    }
