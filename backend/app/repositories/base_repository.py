from typing import Type, TypeVar, Generic
from sqlalchemy.orm import Session

T = TypeVar("T")  # Model


class Base_Repository(Generic[T]):

    def __init__(self, model: Type[T]):
        self.model = model

    def create(self, db: Session, data: dict):
        obj = self.model(**data)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def get_by_id(self, db: Session, id: int):
        return db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, db: Session):
        return db.query(self.model).all()

    def update(self, db: Session, obj: T, data: dict):
        for field, value in data.items():
            setattr(obj, field, value)

        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, obj: T):
        db.delete(obj)
        db.commit()