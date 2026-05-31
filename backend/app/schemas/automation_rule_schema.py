from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Automation_Rule_Schema_Base(BaseModel):
    trigger: str
    condition: Optional[str] = None
    action: str
    is_active: bool = True


class Automation_Rule_Schema_Create(Automation_Rule_Schema_Base):
    pass


class Automation_Rule_Schema_Update(BaseModel):
    trigger: Optional[str] = None
    condition: Optional[str] = None
    action: Optional[str] = None
    is_active: Optional[bool] = None


class Automation_Rule_Schema_Response(Automation_Rule_Schema_Base):
    id: int
    user_id: int
    last_execution: Optional[datetime] = None

    class Config:
        from_attributes = True