from sqlalchemy import Column, Integer, VARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base

class User(Base):
    __tablename__ = "user"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    name = Column(
        VARCHAR(60), 
        nullable=True
    )

    