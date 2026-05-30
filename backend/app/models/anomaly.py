from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, VARCHAR, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Anomaly(Base):
    __tablename__ = "anomaly"

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

    transaction_id = Column(
        Integer,
        ForeignKey("transaction.id"),
        nullable=True
    )

    category_id = Column(
        Integer,
        ForeignKey("transaction_category.id"),
        nullable=True
    )

    expected_value = Column(
        NUMERIC(10, 2),
        nullable=True
    )

    actual_value = Column(
        NUMERIC(10, 2),
        nullable=False
    )

    deviation_percentage = Column(
        NUMERIC(5, 2),
        nullable=True
    )

    status = Column(
        VARCHAR(30),
        nullable=False,
        default="pendente"
    )

    detected_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship("User")
    transaction = relationship("Transaction")
    category = relationship("Transaction_Category")
