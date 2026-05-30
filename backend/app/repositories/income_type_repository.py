from app.models.income_type import Income_Type
from app.repositories.base_repository import Base_Repository


class Income_Type_Repository(Base_Repository[Income_Type]):

    def __init__(self):
        super().__init__(Income_Type)