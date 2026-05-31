from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class Anomaly_Schema_Base(BaseModel):
    transaction_id: Optional[int] = None
    category_id: Optional[int] = None
    expected_value: Optional[Decimal] = None
    actual_value: Decimal
    deviation_percentage: Optional[Decimal] = None
    status: str = "pendente"


class Anomaly_Schema_Create(Anomaly_Schema_Base):
    pass


class Anomaly_Schema_Update(BaseModel):
    transaction_id: Optional[int] = None
    category_id: Optional[int] = None
    expected_value: Optional[Decimal] = None
    actual_value: Optional[Decimal] = None
    deviation_percentage: Optional[Decimal] = None
    status: Optional[str] = None


class Anomaly_Schema_Response(Anomaly_Schema_Base):
    id: int
    user_id: int
    detected_at: datetime

    class Config:
        from_attributes = True