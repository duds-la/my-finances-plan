from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import date


class Financial_Goal_Schema_Base(BaseModel):
    title: str
    target_value: Decimal
    current_value: Decimal = Decimal("0")
    deadline: Optional[date] = None
    status: str = "em_andamento"
    suggested_contribution: Optional[Decimal] = None


class Financial_Goal_Schema_Create(Financial_Goal_Schema_Base):
    pass


class Financial_Goal_Schema_Update(BaseModel):
    title: Optional[str] = None
    target_value: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    deadline: Optional[date] = None
    status: Optional[str] = None
    suggested_contribution: Optional[Decimal] = None


class Financial_Goal_Schema_Response(Financial_Goal_Schema_Base):
    id: int
    user_id: int

    class Config:
        from_attributes = True
