from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, VARCHAR, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Category_Reserve(Base):
    __tablename__ = "category_reserve"

    __table_args__ = (
        UniqueConstraint("user_id", "category_id", "month", "year",
                         name="uq_category_reserve_user_cat_month_year"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, index=True)
    user_id     = Column(Integer, ForeignKey("user.id"),                    nullable=False)
    category_id = Column(Integer, ForeignKey("transaction_category.id"),    nullable=False)

    month = Column(Integer, nullable=False)
    year  = Column(Integer, nullable=False)

    reserved_value = Column(NUMERIC(10, 2), nullable=False)
    note           = Column(VARCHAR(255),   nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user     = relationship("User")
    category = relationship("Transaction_Category")