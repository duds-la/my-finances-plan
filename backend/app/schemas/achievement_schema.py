from pydantic import BaseModel
from typing import Optional


class Achievement_Schema_Base(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    points: int = 0


class Achievement_Schema_Create(Achievement_Schema_Base):
    pass


class Achievement_Schema_Update(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    points: Optional[int] = None


class Achievement_Schema_Response(Achievement_Schema_Base):
    id: int

    class Config:
        from_attributes = True
