from sqlalchemy import Column, Integer, VARCHAR

from app.database.base import Base


class Achievement(Base):
    __tablename__ = "achievement"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    code = Column(
        VARCHAR(30),
        nullable=False,
        unique=True
    )

    title = Column(
        VARCHAR(80),
        nullable=False
    )

    description = Column(
        VARCHAR(255),
        nullable=True
    )

    icon = Column(
        VARCHAR(80),
        nullable=True
    )

    points = Column(
        Integer,
        nullable=False,
        default=0
    )
