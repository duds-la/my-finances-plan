from app.models.investment_type import Investment_Type
from app.repositories.base_repository import Base_Repository


class Investment_Type_Repository(Base_Repository[Investment_Type]):

    def __init__(self):
        super().__init__(Investment_Type)