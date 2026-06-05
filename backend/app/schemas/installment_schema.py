from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import date, datetime


# ── Parcela individual ────────────────────────────────────────────────────────

class Installment_Schema_Response(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_id: int
    installment_number: int
    due_date: date
    value: float
    status: str
    transaction_id: Optional[int]
    created_at: datetime
    updated_at: datetime


# ── Plano de parcelamento ─────────────────────────────────────────────────────

class Installment_Plan_Schema_Create(BaseModel):
    category_id: int
    description: str
    total_value: float
    installment_value: float
    total_installments: int
    first_due_date: date

    @field_validator("total_installments")
    @classmethod
    def at_least_one(cls, v: int) -> int:
        if v < 1:
            raise ValueError("total_installments deve ser >= 1")
        return v

    @field_validator("installment_value", "total_value")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Valor deve ser positivo")
        return v


class Installment_Plan_Schema_Update(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None   # "cancelled"


class Installment_Plan_Schema_Response(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category_id: int
    description: str
    total_value: float
    installment_value: float
    total_installments: int
    paid_installments: int
    first_due_date: date
    status: str
    created_at: datetime
    updated_at: datetime


class Installment_Plan_Schema_Enriched(BaseModel):
    """Plano enriquecido com parcelas e dados calculados em tempo real."""
    id: int
    user_id: int
    category_id: int
    category_name: str
    category_acronym: str
    description: str
    total_value: float
    installment_value: float
    total_installments: int
    paid_installments: int
    remaining_installments: int
    remaining_value: float        # valor ainda a pagar
    progress_percentage: float    # % do plano já pago
    first_due_date: date
    next_due_date: Optional[date] # próxima parcela pendente
    status: str
    installments: List[Installment_Schema_Response]


# ── Payload para confirmar pagamento ─────────────────────────────────────────

class Installment_Pay_Schema(BaseModel):
    transaction_type_id: int      # tipo "saída" cadastrado no sistema
    paid_date: Optional[date] = None  # default: hoje


# ── Resumo geral ─────────────────────────────────────────────────────────────

class Installment_Summary_Schema(BaseModel):
    total_plans: int
    active_plans: int
    total_committed_monthly: float  # parcelas vencendo no mês de referência
    total_remaining_value: float    # total ainda a pagar em todos os planos
    plans: List[Installment_Plan_Schema_Enriched]
