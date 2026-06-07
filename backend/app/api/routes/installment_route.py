from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime
from dateutil.relativedelta import relativedelta

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.transaction_category import Transaction_Category
from app.models.installment_plan import Installment_Plan
from app.models.installment import Installment
from app.schemas.installment_schema import (
    Installment_Plan_Schema_Create,
    Installment_Plan_Schema_Update,
    Installment_Plan_Schema_Response,
    Installment_Plan_Schema_Enriched,
    Installment_Schema_Response,
    Installment_Pay_Schema,
    Installment_Summary_Schema,
)
from app.repositories.installment_repository import (
    Installment_Plan_Repository,
    Installment_Repository,
)

router = APIRouter(prefix="/installment", tags=["installment"])

plan_repo = Installment_Plan_Repository()
inst_repo = Installment_Repository()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich_plan(db: Session, plan: Installment_Plan) -> Installment_Plan_Schema_Enriched:
    cat = db.get(Transaction_Category, plan.category_id)
    installments = inst_repo.get_by_plan(db, plan.id)

    paid = [i for i in installments if i.status == "paid"]
    pending = [i for i in installments if i.status == "pending"]

    remaining_value = round(sum(float(i.value) for i in pending), 2)
    progress_pct = (
        round((len(paid) / plan.total_installments) * 100, 2)
        if plan.total_installments > 0 else 0.0
    )
    next_due = pending[0].due_date if pending else None

    return Installment_Plan_Schema_Enriched(
        id=plan.id,
        user_id=plan.user_id,
        category_id=plan.category_id,
        category_name=cat.description if cat else "—",
        category_acronym=(cat.acronym or "?").strip() if cat else "?",
        description=plan.description,
        total_value=float(plan.total_value),
        installment_value=float(plan.installment_value),
        total_installments=plan.total_installments,
        paid_installments=len(paid),
        remaining_installments=len(pending),
        remaining_value=remaining_value,
        progress_percentage=progress_pct,
        first_due_date=plan.first_due_date,
        next_due_date=next_due,
        status=plan.status,
        installments=[Installment_Schema_Response.model_validate(i) for i in installments],
    )


def _generate_installments(db: Session, plan: Installment_Plan, user_id: int) -> None:
    """Gera as N parcelas mensais a partir de first_due_date."""
    for n in range(plan.total_installments):
        due = plan.first_due_date + relativedelta(months=n)
        inst = Installment(
            plan_id=plan.id,
            user_id=user_id,
            installment_number=n + 1,
            due_date=due,
            value=plan.installment_value,
            status="pending",
        )
        db.add(inst)
    db.commit()


def _sync_plan_status(db: Session, plan: Installment_Plan) -> None:
    """Recalcula paid_installments e status do plano."""
    installments = inst_repo.get_by_plan(db, plan.id)
    paid_count = sum(1 for i in installments if i.status == "paid")
    plan.paid_installments = paid_count
    if paid_count >= plan.total_installments:
        plan.status = "completed"
    db.commit()
    db.refresh(plan)


# ── Planos ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=Installment_Plan_Schema_Enriched, status_code=status.HTTP_201_CREATED)
def create_plan(
    data: Installment_Plan_Schema_Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria um plano de parcelamento e gera automaticamente todas as parcelas.
    Exemplo: 3x de R$60 com 1ª parcela em 10/07/2026 → gera parcelas em 10/07, 10/08, 10/09.
    """
    if not db.get(Transaction_Category, data.category_id):
        raise HTTPException(status_code=404, detail=f"Categoria {data.category_id} não encontrada")

    payload = data.model_dump()
    payload["user_id"] = current_user.id
    payload["paid_installments"] = 0
    payload["status"] = "active"

    plan = plan_repo.create(db, payload)
    _generate_installments(db, plan, current_user.id)
    return _enrich_plan(db, plan)


@router.get("/", response_model=List[Installment_Plan_Schema_Enriched])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return [_enrich_plan(db, p) for p in plan_repo.get_all_by_user(db, current_user.id)]


@router.get("/summary", response_model=Installment_Summary_Schema)
def get_summary(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumo com comprometimento mensal e total restante a pagar."""
    now = datetime.utcnow()
    ref_month = month or now.month
    ref_year  = year  or now.year

    plans    = plan_repo.get_all_by_user(db, current_user.id)
    enriched = [_enrich_plan(db, p) for p in plans]
    active   = [e for e in enriched if e.status == "active"]

    committed = 0.0
    for e in active:
        for inst in e.installments:
            if inst.due_date.month == ref_month and inst.due_date.year == ref_year and inst.status == "pending":
                committed += inst.value

    return Installment_Summary_Schema(
        total_plans=len(plans),
        active_plans=len(active),
        total_committed_monthly=round(committed, 2),
        total_remaining_value=round(sum(e.remaining_value for e in active), 2),
        plans=enriched,
    )


@router.get("/{plan_id}", response_model=Installment_Plan_Schema_Enriched)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = plan_repo.get_by_id_and_user(db, plan_id, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return _enrich_plan(db, plan)


@router.patch("/{plan_id}", response_model=Installment_Plan_Schema_Response)
def update_plan(
    plan_id: int,
    data: Installment_Plan_Schema_Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = plan_repo.get_by_id_and_user(db, plan_id, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    if plan.status == "completed":
        raise HTTPException(status_code=400, detail="Plano já concluído não pode ser alterado")
    return plan_repo.update(db, plan, data.model_dump(exclude_none=True))


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = plan_repo.get_by_id_and_user(db, plan_id, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    if plan.paid_installments > 0:
        raise HTTPException(
            status_code=400,
            detail="Não é possível remover um plano com parcelas pagas. Use PATCH para cancelar.",
        )
    plan_repo.delete(db, plan)


# ── Parcelas ──────────────────────────────────────────────────────────────────

@router.post("/{plan_id}/installments/{installment_id}/pay", response_model=Installment_Schema_Response)
def pay_installment(
    plan_id: int,
    installment_id: int,
    data: Installment_Pay_Schema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(">>> PAY DATA:", data)   # ← adicione esta linha
    """
    Confirma o pagamento de uma parcela:
    1. Cria uma Transaction negativa na categoria do plano
    2. Vincula installment.transaction_id à transação criada
    3. Atualiza status da parcela → paid
    4. Recalcula paid_installments e status do plano
    """
    plan = plan_repo.get_by_id_and_user(db, plan_id, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    inst = inst_repo.get_by_id_and_user(db, installment_id, current_user.id)
    if not inst or inst.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="Parcela não encontrada")
    if inst.status == "paid":
        raise HTTPException(status_code=400, detail="Parcela já foi paga")

    paid_date = data.paid_date or date.today()

    tx = Transaction(
        user_id=current_user.id,
        transaction_type_id=data.transaction_type_id,
        transaction_category_id=plan.category_id,
        transaction_value=-abs(float(inst.value)),
        transaction_date=datetime.combine(paid_date, datetime.min.time()),
        description=f"{plan.description} — parcela {inst.installment_number}/{plan.total_installments}",
    )
    db.add(tx)
    db.flush()

    inst.transaction_id = tx.id
    inst.status = "paid"
    inst.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(inst)

    _sync_plan_status(db, plan)
    return inst


@router.post("/{plan_id}/installments/{installment_id}/unpay", response_model=Installment_Schema_Response)
def unpay_installment(
    plan_id: int,
    installment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Desfaz o pagamento de uma parcela:
    1. Remove a Transaction vinculada
    2. Volta status para pending
    3. Recalcula o plano
    """
    plan = plan_repo.get_by_id_and_user(db, plan_id, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    inst = inst_repo.get_by_id_and_user(db, installment_id, current_user.id)
    if not inst or inst.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="Parcela não encontrada")
    if inst.status != "paid":
        raise HTTPException(status_code=400, detail="Parcela não está paga")

    if inst.transaction_id:
        tx = db.get(Transaction, inst.transaction_id)
        if tx:
            db.delete(tx)

    inst.transaction_id = None
    inst.status = "pending"
    inst.updated_at = datetime.utcnow()
    if plan.status == "completed":
        plan.status = "active"
    db.commit()
    db.refresh(inst)

    _sync_plan_status(db, plan)
    return inst
