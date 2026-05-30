from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class Investment_Type_Schema_Base(BaseModel):
    acronym: str
    description: Optional[str] = None
    daily_liquidity: bool = False
    fixed_income: bool = False
    ir_discount: Optional[Decimal] = None


class Investment_Type_Schema_Create(Investment_Type_Schema_Base):
    pass


class Investment_Type_Schema_Update(BaseModel):
    acronym: Optional[str] = None
    description: Optional[str] = None
    daily_liquidity: Optional[bool] = None
    fixed_income: Optional[bool] = None
    ir_discount: Optional[Decimal] = None


class Investment_Type_Schema_Response(Investment_Type_Schema_Base):
    id: int

    class Config:
        from_attributes = True