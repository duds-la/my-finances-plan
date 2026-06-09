from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Guest_Access(Base):
    """
    Relaciona um dono (owner) a um convidado (guest).
    shared_goal_ids     → lista de IDs de financial_goal visíveis ao convidado
    shared_investment_ids → lista de IDs de investment visíveis ao convidado
    allowed_modules     → lista de strings: "metas", "investimentos"
    """
    __tablename__ = "guest_access"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, index=True)

    owner_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    guest_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    allowed_modules       = Column(JSON, nullable=False, default=list)   # ["metas","investimentos"]
    shared_goal_ids       = Column(JSON, nullable=False, default=list)   # [1, 3, 5]
    shared_investment_ids = Column(JSON, nullable=False, default=list)   # [2, 4]

    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", foreign_keys=[owner_id])
    guest = relationship("User", foreign_keys=[guest_id])
