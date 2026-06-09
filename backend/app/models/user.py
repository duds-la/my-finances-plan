from sqlalchemy import Column, Integer, VARCHAR, Boolean
from sqlalchemy.orm import relationship

from app.database.base import Base


class User(Base):
    __tablename__ = "user"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        index=True,
    )

    name = Column(VARCHAR(60), nullable=True)

    password = Column(VARCHAR(255), nullable=False)

    # True = usuário convidado (somente leitura, acesso restrito)
    is_guest = Column(Boolean, nullable=False, default=False, server_default="false")
