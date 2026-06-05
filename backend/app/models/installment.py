from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, Date, DateTime, VARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Installment(Base):
    __tablename__ = "installment"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("installment_plan.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    value = Column(NUMERIC(10, 2), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transaction.id"), nullable=True)
    # pending | paid | overdue
    status = Column(VARCHAR(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    plan = relationship("Installment_Plan", back_populates="installments")
    user = relationship("User")
    transaction = relationship("Transaction")
