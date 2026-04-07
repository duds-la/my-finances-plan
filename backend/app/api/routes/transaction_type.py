from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt

from app.database.session import get_db
from app.models.transaction_type import Transaction_Type
from app.schemas.transaction_type import Transaction_Type_Base, Transaction_Type_Create, Transaction_Type_Update, Transaction_Type_Response
from app.core.config import settings

router = APIRouter(prefix="/transaction_type", tags=["transaction_type"])

@router.post("/create-transaction-type", response_model=Transaction_Type_Response)
def login(data: Transaction_Type_Base, db: Session = Depends(get_db)):

    return True