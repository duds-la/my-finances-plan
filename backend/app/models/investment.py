from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, VARCHAR, Date
from sqlalchemy.orm import relationship

from app.database.base import Base


class Investment(Base):
    __tablename__ = "investment"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("user.id"),
        nullable=False
    )

    investment_type_id = Column(
        Integer,
        ForeignKey("investment_type.id"),
        nullable=False
    )

    transaction_id = Column(
        Integer,
        ForeignKey("transaction.id"),
        nullable=True
    )

    invested_value = Column(
        NUMERIC(10, 2),
        nullable=False
    )

    interest_rate = Column(
        NUMERIC(5, 4),
        nullable=True
    )

    maturity_date = Column(
        Date,
        nullable=True
    )

    application_date = Column(
        Date,
        nullable=False
    )

    status = Column(
        VARCHAR(30),
        nullable=False,
        default="ativo"
    )

    user = relationship("User")
    investment_type = relationship("Investment_Type")
    transaction = relationship("Transaction")