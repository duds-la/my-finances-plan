from sqlalchemy import Column, Integer, ForeignKey, CHAR, VARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base

class Transaction_Type(Base):
    __tablename__ = "transaction_type"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    description = Column(
        VARCHAR(120), 
        nullable=True
    )

    