from sqlalchemy import Column, Integer, ForeignKey, DateTime, NUMERIC, VARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base

class Transaction(Base):
    __tablename__ = "transaction"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    transaction_date = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False
    )

    transaction_value = Column(
        NUMERIC(10,2), 
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("user.id"),
        nullable=False
    )

    transaction_type_id = Column(
        Integer,
        ForeignKey("transaction_type.id"),
        nullable=False
    )

    transaction_category_id = Column(
        Integer,
        ForeignKey("transaction_category.id"),
        nullable=False
    )

    description = Column(
        VARCHAR(255), 
        nullable=True
    )

    user = relationship("User")
    transaction_type = relationship("Transaction_Type")
    transaction_category = relationship("Transaction_Category")