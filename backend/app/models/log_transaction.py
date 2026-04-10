from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Log_Transaction(Base):
    __tablename__ = "log_transaction"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        Integer,
        ForeignKey("transactio.id"),
        nullable=False
    )
    
    log_date = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False
    )

    transaction = relationship("Transaction")
