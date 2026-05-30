from sqlalchemy import Column, Integer, VARCHAR, NUMERIC, Date, DateTime
from datetime import datetime

from app.database.base import Base


class External_Data(Base):
    __tablename__ = "external_data"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True
    )

    source = Column(
        VARCHAR(80),
        nullable=False
    )

    indicator = Column(
        VARCHAR(80),
        nullable=False
    )

    value = Column(
        NUMERIC(15, 6),
        nullable=False
    )

    reference_date = Column(
        Date,
        nullable=False
    )

    collected_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
