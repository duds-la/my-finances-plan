from pydantic import BaseModel
from typing import Optional


class Transaction_Category_Schema_Base(BaseModel):
    description: str
    acronym: str


class Transaction_Category_Schema_Create(Transaction_Category_Schema_Base):
    pass


class Transaction_Category_Schema_Update(BaseModel):
    description: Optional[str] = None
    acronym: Optional[str] = None


class Transaction_Category_Schema_Response(Transaction_Category_Schema_Base):
    id: int

    class Config:
        from_attributes = True  # SQLAlchemy 2.0