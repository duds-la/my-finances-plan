from app.models.log_transaction import Log_Transaction
from app.repositories.base_repository import Base_Repository

class Log_Transaction_Repository(Base_Repository[Log_Transaction]):
    
    def __init__(self, model):
        super().__init__(Log_Transaction)