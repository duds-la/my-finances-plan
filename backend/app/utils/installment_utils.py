from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.installment import Installment
from app.models.installment_plan import Installment_Plan


def get_committed_by_category(
    db: Session,
    user_id: int,
    category_id: int,
    month: int,
    year: int,
) -> float:
    """
    Soma o valor das parcelas PENDENTES vinculadas à categoria
    que vencem no mês/ano informado.

    Usado em caixinhas e orçamentos para mostrar o comprometimento
    futuro de compras parceladas ainda não pagas.
    """
    result = (
        db.query(func.sum(Installment.value))
        .join(Installment_Plan, Installment.plan_id == Installment_Plan.id)
        .filter(
            Installment.user_id == user_id,
            Installment.status == "pending",
            Installment_Plan.category_id == category_id,
            Installment_Plan.status == "active",
            func.extract("month", Installment.due_date) == month,
            func.extract("year",  Installment.due_date) == year,
        )
        .scalar()
    ) or 0.0
    return round(float(result), 2)
