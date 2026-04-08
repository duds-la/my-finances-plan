from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt

from app.database.session import get_db
from app.models.transaction import Transaction
from app.schemas.transaction_schema import *
from app.core.config import settings

router = APIRouter(prefix="/transaction", tags=["transaction"])

@router.post("/create-transaction-category", response_model=Transaction_Schema_Response)
def login(data: Transaction_Schema_Base, db: Session = Depends(get_db)):

    return True