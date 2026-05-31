from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import date, datetime


class External_Data_Schema_Base(BaseModel):
    source: str
    indicator: str
    value: Decimal
    reference_date: date


class External_Data_Schema_Create(External_Data_Schema_Base):
    pass


class External_Data_Schema_Update(BaseModel):
    source: Optional[str] = None
    indicator: Optional[str] = None
    value: Optional[Decimal] = None
    reference_date: Optional[date] = None


class External_Data_Schema_Response(External_Data_Schema_Base):
    id: int
    collected_at: datetime

    class Config:
        from_attributes = True