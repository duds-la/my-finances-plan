from sqlalchemy import Column, Integer, VARCHAR
from app.database.base import Base


class Income_Type(Base):
    __tablename__ = "income_type"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    description = Column(
        VARCHAR(120),
        nullable=False
    )