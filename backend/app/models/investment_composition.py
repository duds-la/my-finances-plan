from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, VARCHAR
from sqlalchemy.orm import relationship

from app.database.base import Base


class Investment_Composition(Base):
    __tablename__ = "investment_composition"

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

    transaction_id = Column(
        Integer,
        ForeignKey("transaction.id"),
        nullable=False
    )

    percentage = Column(
        NUMERIC(5, 2),
        nullable=False
    )

    observation = Column(
        VARCHAR(255),
        nullable=True
    )

    investment = relationship("Investment")
    transaction = relationship("Transaction")