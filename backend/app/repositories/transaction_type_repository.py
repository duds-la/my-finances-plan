from app.models.transaction_type import Transaction_Type
from app.repositories.base_repository import Base_Repository


class Transaction_Type_Repository(Base_Repository[Transaction_Type]):

    def __init__(self):
        super().__init__(Transaction_Type)