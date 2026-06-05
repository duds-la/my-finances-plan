from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, VARCHAR, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Installment_Plan(Base):
    __tablename__ = "installment_plan"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("transaction_category.id"), nullable=False)
    description = Column(VARCHAR(255), nullable=False)
    total_value = Column(NUMERIC(10, 2), nullable=False)
    installment_value = Column(NUMERIC(10, 2), nullable=False)
    total_installments = Column(Integer, nullable=False)
    paid_installments = Column(Integer, nullable=False, default=0)
    first_due_date = Column(Date, nullable=False)
    # active | completed | cancelled
    status = Column(VARCHAR(20), nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
    category = relationship("Transaction_Category")
    installments = relationship("Installment", back_populates="plan", cascade="all, delete-orphan")
