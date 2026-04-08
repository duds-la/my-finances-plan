from pydantic import BaseModel
from typing import Optional

class Transaction_Schema_Base(BaseModel):
    description: str

class Transaction_Schema_Create(Transaction_Schema_Base):
    pass

class Transaction_Schema_Update(Transaction_Schema_Base):
    description:Optional[str] = None

class Transaction_Schema_Response(Transaction_Schema_Base):
    id: int

    class Config:
        from_attributes = True  # SQLAlchemy 2.0