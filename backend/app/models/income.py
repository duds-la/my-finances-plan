from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, Date
from sqlalchemy.orm import relationship

from app.database.base import Base


class Income(Base):
    __tablename__ = "income"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    investment_id = Column(
        Integer,
        ForeignKey("investment.id"),
        nullable=False
    )

    income_type_id = Column(
        Integer,
        ForeignKey("income_type.id"),
        nullable=False
    )

    income_date = Column(
        Date,
        nullable=False
    )

    income_value = Column(
        NUMERIC(10, 2),
        nullable=False
    )

    ir_withheld = Column(
        NUMERIC(10, 2),
        nullable=True,
        default=0
    )

    investment = relationship("Investment")
    income_type = relationship("Income_Type")