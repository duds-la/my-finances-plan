from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Goal_Contribution(Base):
    __tablename__ = "goal_contribution"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    goal_id = Column(
        Integer,
        ForeignKey("financial_goal.id"),
        nullable=False
    )

    transaction_id = Column(
        Integer,
        ForeignKey("transaction.id"),
        nullable=True
    )

    value = Column(
        NUMERIC(10, 2),
        nullable=False
    )

    contribution_date = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    goal = relationship("Financial_Goal")
    transaction = relationship("Transaction")
