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


# Schema enriquecido retornado pelo endpoint de resumo
class Category_Reserve_Schema_Enriched(BaseModel):
    id: int
    user_id: int
    category_id: int
    category_name: str
    category_acronym: str
    reserved_value: float
    spent_value: float          # gasto real acumulado no mês corrente
    available_value: float      # reserved_value - spent_value
    spent_percentage: float     # % do reservado já gasto
    note: Optional[str]


class Reserve_Summary_Schema(BaseModel):
    """Resumo geral das caixinhas do usuário"""
    total_reserved: float       # soma de todos os reserved_value
    total_spent: float          # soma de todos os gastos do mês nas categorias reservadas
    total_available: float      # total_reserved - total_spent
    free_balance: float         # saldo total do usuário - total_reserved
    reserves: list[Category_Reserve_Schema_Enriched]