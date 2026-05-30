from sqlalchemy import Column, Integer, ForeignKey, VARCHAR, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class Simulation(Base):
    __tablename__ = "simulation"

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

    simulation_type = Column(
        VARCHAR(60),
        nullable=False
    )

    parameters = Column(
        JSON,
        nullable=False
    )

    result = Column(
        JSON,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship("User")
