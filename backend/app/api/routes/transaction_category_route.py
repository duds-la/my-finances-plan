from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt

from app.database.session import get_db
from app.models.transaction_category import Transaction_Category
from app.schemas.transaction_category_schema import *
from app.core.config import settings

router = APIRouter(prefix="/transaction_category", tags=["transaction_category"])

@router.post("/create-transaction-category", response_model=Transaction_Category_Schema_Response)
def login(data: Transaction_Category_Schema_Base, db: Session = Depends(get_db)):

    return True