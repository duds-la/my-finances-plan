from pydantic import BaseModel
from typing import Optional

class Log_Transaction_Schema_Base(BaseModel):
    description: str

class Log_Transaction_Schema_Create(Log_Transaction_Schema_Base):
    pass

class Log_Transaction_Schema_Update(Log_Transaction_Schema_Base):
    description:Optional[str] = None

class Log_Transaction_Schema_Response(Log_Transaction_Schema_Base):
    id: int

    class Config:
        from_attributes = True  # SQLAlchemy 2.0