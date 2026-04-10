from app.models.transaction import Transaction
from app.repositories.base_repository import Base_Repository

class Transaction_Repository(Base_Repository[Transaction]):
    
    def __init__(self, model):
        super().__init__(Transaction)