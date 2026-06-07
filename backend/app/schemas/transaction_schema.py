from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
 
 
class Transaction_Schema_Base(BaseModel):
    transaction_value: Decimal
    transaction_date: Optional[datetime] = None
    transaction_type_id: int
    transaction_category_id: int
    description: Optional[str] = None
 
 
class Transaction_Schema_Create(Transaction_Schema_Base):
    pass
 
 
class Transaction_Schema_Update(BaseModel):
    transaction_value: Optional[Decimal] = None
    transaction_date: Optional[datetime] = None
    transaction_type_id: Optional[int] = None
    transaction_category_id: Optional[int] = None
    description: Optional[str] = None
 
 
class Transaction_Schema_Response(Transaction_Schema_Base):
    id: int
    user_id: int
    transaction_date: datetime
 
    class Config:
        from_attributes = True  # SQLAlchemy 2.0