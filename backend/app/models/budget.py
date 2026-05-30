from sqlalchemy import Column, Integer, ForeignKey, NUMERIC
from sqlalchemy.orm import relationship

from app.database.base import Base


class Budget(Base):
    __tablename__ = "budget"

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

    category_id = Column(
        Integer,
        ForeignKey("transaction_category.id"),
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

    limit_value = Column(
        NUMERIC(10, 2),
        nullable=False
    )

    current_spent = Column(
        NUMERIC(10, 2),
        nullable=False,
        default=0
    )

    consumed_percentage = Column(
        NUMERIC(5, 2),
        nullable=False,
        default=0
    )

    user = relationship("User")
    category = relationship("Transaction_Category")
