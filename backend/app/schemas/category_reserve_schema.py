from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class Category_Reserve_Schema_Create(BaseModel):
    category_id: int
    reserved_value: float
    note: Optional[str] = None


class Category_Reserve_Schema_Update(BaseModel):
    reserved_value: Optional[float] = None
    note: Optional[str] = None


class Category_Reserve_Schema_Response(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category_id: int
    reserved_value: float
    note: Optional[str]
    created_at: datetime
    updated_at: datetime


class Category_Reserve_Schema_Enriched(BaseModel):
    id: int
    user_id: int
    category_id: int
    category_name: str
    category_acronym: str
    reserved_value: float
    spent_value: float           # gasto real (transações já lançadas)
    committed_value: float       # parcelas pendentes que vencem no mês
    available_value: float       # reserved - spent - committed
    spent_percentage: float      # % gasto real sobre o reservado
    committed_percentage: float  # % comprometido com parcelas sobre o reservado
    note: Optional[str]


class Reserve_Summary_Schema(BaseModel):
    total_reserved: float
    total_spent: float
    total_committed: float       # soma dos committed_value de todas as caixinhas
    total_available: float
    free_balance: float
    reserves: list[Category_Reserve_Schema_Enriched]
