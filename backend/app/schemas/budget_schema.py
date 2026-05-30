from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class Budget_Schema_Base(BaseModel):
    category_id: int
    month: int
    year: int
    limit_value: Decimal
    current_spent: Decimal = Decimal("0")
    consumed_percentage: Decimal = Decimal("0")


class Budget_Schema_Create(Budget_Schema_Base):
    pass


class Budget_Schema_Update(BaseModel):
    category_id: Optional[int] = None
    month: Optional[int] = None
    year: Optional[int] = None
    limit_value: Optional[Decimal] = None
    current_spent: Optional[Decimal] = None
    consumed_percentage: Optional[Decimal] = None


class Budget_Schema_Response(Budget_Schema_Base):
    id: int
    user_id: int

    class Config:
        from_attributes = True
