from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt

from app.database.session import get_db
from app.models.log_transaction import Log_Transaction
from app.schemas.log_transaction_schema import *
from app.core.config import settings

router = APIRouter(prefix="/log_transaction", tags=["log_transaction"])

@router.post("/create-transaction-category", response_model=Log_Transaction_Schema_Response)
def login(data: Log_Transaction_Schema_Base, db: Session = Depends(get_db)):

    return True