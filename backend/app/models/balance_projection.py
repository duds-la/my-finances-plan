from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Balance_Projection(Base):
    __tablename__ = "balance_projection"

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

    period_days = Column(
        Integer,
        nullable=False
    )

    current_balance = Column(
        NUMERIC(10, 2),
        nullable=False
    )

    projected_balance = Column(
        NUMERIC(10, 2),
        nullable=False
    )

    expected_inflows = Column(
        JSON,
        nullable=True
    )

    expected_outflows = Column(
        JSON,
        nullable=True
    )

    generated_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship("User")
