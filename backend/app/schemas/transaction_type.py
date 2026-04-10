from pydantic import BaseModel
from typing import Optional

class Transaction_Type_Base(BaseModel):
    description: str
    #todo-do: implmenting is_active

class Transaction_Type_Create(Transaction_Type_Base):
    pass

class Transaction_Type_Update(Transaction_Type_Base):
    description:Optional[str] = None

class Transaction_Type_Response(Transaction_Type_Base):
    id: int

    class Config:
        from_attributes = True  # SQLAlchemy 2.0