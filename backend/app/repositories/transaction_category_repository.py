from app.models.transaction_category import Transaction_Category
from app.repositories.base_repository import Base_Repository

class Transaction_Category_Repository(Base_Repository[Transaction_Category]):
    
    def __init__(self, model):
        super().__init__(Transaction_Category)