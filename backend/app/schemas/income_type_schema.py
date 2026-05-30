from pydantic import BaseModel
from typing import Optional


class Income_Type_Schema_Base(BaseModel):
    description: str


class Income_Type_Schema_Create(Income_Type_Schema_Base):
    pass


class Income_Type_Schema_Update(BaseModel):
    description: Optional[str] = None


class Income_Type_Schema_Response(Income_Type_Schema_Base):
    id: int

    class Config:
        from_attributes = True