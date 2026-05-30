from sqlalchemy import Column, Integer, VARCHAR, Boolean, NUMERIC
from app.database.base import Base


class Investment_Type(Base):
    __tablename__ = "investment_type"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    acronym = Column(
        VARCHAR(10),
        nullable=False
    )

    description = Column(
        VARCHAR(120),
        nullable=True
    )

    daily_liquidity = Column(
        Boolean,
        nullable=False,
        default=False
    )

    fixed_income = Column(
        Boolean,
        nullable=False,
        default=False
    )

    ir_discount = Column(
        NUMERIC(5, 2),
        nullable=True
    )