from sqlalchemy import Column, Integer, ForeignKey, NUMERIC, VARCHAR, Date
from sqlalchemy.orm import relationship

from app.database.base import Base


class Financial_Goal(Base):
    __tablename__ = "financial_goal"

    id      = Column(Integer, primary_key=True, autoincrement=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    title          = Column(VARCHAR(120),   nullable=False)
    target_value   = Column(NUMERIC(10, 2), nullable=False)
    current_value  = Column(NUMERIC(10, 2), nullable=False, default=0)
    deadline       = Column(Date,           nullable=True)
    status         = Column(VARCHAR(30),    nullable=False, default="em_andamento")
    suggested_contribution = Column(NUMERIC(10, 2), nullable=True)

    # Liga a meta a um investimento específico
    investment_id  = Column(Integer, ForeignKey("investment.id", ondelete="SET NULL"), nullable=True)

    user       = relationship("User")
    investment = relationship("Investment", foreign_keys=[investment_id])