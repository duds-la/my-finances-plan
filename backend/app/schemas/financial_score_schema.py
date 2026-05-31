from pydantic import BaseModel
from typing import Optional, Any, Dict
from decimal import Decimal
from datetime import datetime


class Financial_Score_Schema_Base(BaseModel):
    month: int
    year: int
    score: Decimal
    expense_income_ratio: Optional[Decimal] = None
    emergency_reserve: Optional[Decimal] = None
    components: Optional[Dict[str, Any]] = None


class Financial_Score_Schema_Create(Financial_Score_Schema_Base):
    pass


class Financial_Score_Schema_Update(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    score: Optional[Decimal] = None
    expense_income_ratio: Optional[Decimal] = None
    emergency_reserve: Optional[Decimal] = None
    components: Optional[Dict[str, Any]] = None


class Financial_Score_Schema_Response(Financial_Score_Schema_Base):
    id: int
    user_id: int
    calculated_at: datetime

    class Config:
        from_attributes = True