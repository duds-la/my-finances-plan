from sqlalchemy import Column, Integer, ForeignKey, CHAR, VARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base

class Transaction_Category(Base):
    __tablename__ = "transaction_category"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    acronym = Column(
        CHAR(4), 
        nullable=False
    )

    description = Column(
        VARCHAR(120), 
        nullable=True
    )

    