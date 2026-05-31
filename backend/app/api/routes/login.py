from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm  # <-- adicionar
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt

from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password
from app.core.config import settings

router = APIRouter(prefix="/login", tags=["login"])


@router.post("/", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.name == data.name).first()

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=400, detail="Credenciais inválidas")

    payload = {
        "sub": str(user.id),
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}


# Rota que o frontend espera
@router.post("/access-token", response_model=TokenResponse)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # O frontend manda "username" (que no seu caso é o email)
    user = db.query(User).filter(User.name == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Credenciais inválidas")

    payload = {
        "sub": str(user.id),
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}