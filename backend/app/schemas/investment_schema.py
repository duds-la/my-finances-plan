from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import date


class Investment_Schema_Base(BaseModel):
    investment_type_id: int
    transaction_id: Optional[int] = None
    invested_value: Decimal
    interest_rate: Optional[Decimal] = None
    maturity_date: Optional[date] = None
    application_date: date
    status: str = "ativo"
    finalidade: Optional[str] = None
    goal_id: Optional[int] = None


class Investment_Schema_Create(Investment_Schema_Base):
    pass


class Investment_Schema_Update(BaseModel):
    investment_type_id: Optional[int] = None
    transaction_id: Optional[int] = None
    invested_value: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    maturity_date: Optional[date] = None
    application_date: Optional[date] = None
    status: Optional[str] = None
    finalidade: Optional[str] = None
    goal_id: Optional[int] = None


class Investment_Schema_Response(Investment_Schema_Base):
    id: int
    user_id: int
    current_value: Optional[Decimal] = None   # calculado pelo backend

    class Config:
        from_attributes = True