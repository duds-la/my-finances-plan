from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class User_Achievement_Schema_Base(BaseModel):
    achievement_id: int
    unlocked_at: Optional[datetime] = None


class User_Achievement_Schema_Create(User_Achievement_Schema_Base):
    pass


class User_Achievement_Schema_Response(User_Achievement_Schema_Base):
    id: int
    user_id: int
    unlocked_at: datetime

    class Config:
        from_attributes = True
