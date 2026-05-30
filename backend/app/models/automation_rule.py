from sqlalchemy import Column, Integer, ForeignKey, VARCHAR, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.database.base import Base


class Automation_Rule(Base):
    __tablename__ = "automation_rule"

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

    trigger = Column(
        VARCHAR(120),
        nullable=False
    )

    condition = Column(
        VARCHAR(255),
        nullable=True
    )

    action = Column(
        VARCHAR(255),
        nullable=False
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    last_execution = Column(
        DateTime,
        nullable=True
    )

    user = relationship("User")
