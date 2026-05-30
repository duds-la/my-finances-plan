from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import date


class Income_Schema_Base(BaseModel):
    investment_id: int
    income_type_id: int
    income_date: date
    income_value: Decimal
    ir_withheld: Optional[Decimal] = None


class Income_Schema_Create(Income_Schema_Base):
    pass


class Income_Schema_Update(BaseModel):
    investment_id: Optional[int] = None
    income_type_id: Optional[int] = None
    income_date: Optional[date] = None
    income_value: Optional[Decimal] = None
    ir_withheld: Optional[Decimal] = None


class Income_Schema_Response(Income_Schema_Base):
    id: int

    class Config:
        from_attributes = True