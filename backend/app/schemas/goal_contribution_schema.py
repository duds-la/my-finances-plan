from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class Goal_Contribution_Schema_Base(BaseModel):
    goal_id: int
    transaction_id: Optional[int] = None
    value: Decimal
    contribution_date: Optional[datetime] = None


class Goal_Contribution_Schema_Create(Goal_Contribution_Schema_Base):
    pass


class Goal_Contribution_Schema_Update(BaseModel):
    goal_id: Optional[int] = None
    transaction_id: Optional[int] = None
    value: Optional[Decimal] = None
    contribution_date: Optional[datetime] = None


class Goal_Contribution_Schema_Response(Goal_Contribution_Schema_Base):
    id: int
    contribution_date: datetime

    class Config:
        from_attributes = True
