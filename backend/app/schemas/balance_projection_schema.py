from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from decimal import Decimal
from datetime import datetime


class Balance_Projection_Schema_Base(BaseModel):
    period_days: int
    current_balance: Decimal
    projected_balance: Decimal
    expected_inflows: Optional[List[Dict[str, Any]]] = None
    expected_outflows: Optional[List[Dict[str, Any]]] = None


class Balance_Projection_Schema_Create(Balance_Projection_Schema_Base):
    pass


class Balance_Projection_Schema_Update(BaseModel):
    period_days: Optional[int] = None
    current_balance: Optional[Decimal] = None
    projected_balance: Optional[Decimal] = None
    expected_inflows: Optional[List[Dict[str, Any]]] = None
    expected_outflows: Optional[List[Dict[str, Any]]] = None


class Balance_Projection_Schema_Response(Balance_Projection_Schema_Base):
    id: int
    user_id: int
    generated_at: datetime

    class Config:
        from_attributes = True