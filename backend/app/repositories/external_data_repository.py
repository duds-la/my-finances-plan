from sqlalchemy.orm import Session
from datetime import date
from app.models.external_data import External_Data
from app.repositories.base_repository import Base_Repository


class External_Data_Repository(Base_Repository[External_Data]):

    def __init__(self):
        super().__init__(External_Data)

    def get_by_indicator(self, db: Session, indicator: str):
        return (
            db.query(External_Data)
            .filter(External_Data.indicator == indicator)
            .order_by(External_Data.reference_date.desc())
            .all()
        )

    def get_by_source_and_indicator(self, db: Session, source: str, indicator: str):
        return (
            db.query(External_Data)
            .filter(
                External_Data.source == source,
                External_Data.indicator == indicator,
            )
            .order_by(External_Data.reference_date.desc())
            .all()
        )

    def get_latest_by_indicator(self, db: Session, indicator: str):
        return (
            db.query(External_Data)
            .filter(External_Data.indicator == indicator)
            .order_by(External_Data.reference_date.desc())
            .first()
        )