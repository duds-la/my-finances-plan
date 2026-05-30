from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Financial_Score(Base):
    __tablename__ = "financial_score"

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

    month = Column(
        Integer,
        nullable=False
    )

    year = Column(
        Integer,
        nullable=False
    )

    score = Column(
        NUMERIC(5, 2),
        nullable=False
    )

    expense_income_ratio = Column(
        NUMERIC(5, 4),
        nullable=True
    )

    emergency_reserve = Column(
        NUMERIC(10, 2),
        nullable=True
    )

    components = Column(
        JSON,
        nullable=True
    )

    calculated_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship("User")
