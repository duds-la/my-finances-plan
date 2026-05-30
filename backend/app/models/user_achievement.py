from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.base import Base


class User_Achievement(Base):
    __tablename__ = "user_achievement"

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

    achievement_id = Column(
        Integer,
        ForeignKey("achievement.id"),
        nullable=False
    )

    unlocked_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship("User")
    achievement = relationship("Achievement")
