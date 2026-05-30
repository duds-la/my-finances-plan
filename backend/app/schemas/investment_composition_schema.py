from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class Investment_Composition_Schema_Base(BaseModel):
    investment_id: int
    transaction_id: int
    percentage: Decimal
    observation: Optional[str] = None


class Investment_Composition_Schema_Create(Investment_Composition_Schema_Base):
    pass


class Investment_Composition_Schema_Update(BaseModel):
    investment_id: Optional[int] = None
    transaction_id: Optional[int] = None
    percentage: Optional[Decimal] = None
    observation: Optional[str] = None


class Investment_Composition_Schema_Response(Investment_Composition_Schema_Base):
    id: int

    class Config:
        from_attributes = True