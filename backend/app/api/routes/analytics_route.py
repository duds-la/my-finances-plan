"""
analytics_route.py  — POST /api/v1/analytics/calculate

Calcula e persiste os 10 indicadores financeiros do usuário:

  1.  score_geral            – Nota 0-100 ponderada dos demais indicadores
  2.  expense_income_ratio   – Comprometimento da renda (despesas / receitas)
  3.  savings_rate           – Taxa de poupança real do mês (%)
  4.  burn_rate_trend        – Tendência de gasto vs média dos últimos 3 meses (%)
  5.  category_concentration – Índice HHI de concentração de gastos por categoria
  6.  investment_rate        – % da renda bruta que vai para investimentos
  7.  emergency_months       – Meses de reserva de emergência disponíveis
  8.  goal_coverage          – % das metas ativas com aporte suficiente
  9.  anomaly_count          – Nº de categorias com desvio > 30% vs média histórica
  10. monthly_volatility     – Coeficiente de variação do saldo mensal (estabilidade)

Também grava:
  - Registros de anomalia na tabela `anomaly` para categorias discrepantes
  - Projeção de saldo de 30 e 90 dias na tabela `balance_projection`

Endpoints:
  POST /api/v1/analytics/calculate           → calcula e salva o mês atual
  GET  /api/v1/analytics/dashboard/{month}/{year}  → retorna snapshot completo
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal
from collections import defaultdict
import statistics
import math

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.transaction_type import Transaction_Type
from app.models.transaction_category import Transaction_Category
from app.models.investment import Investment
from app.models.income import Income
from app.models.financial_goal import Financial_Goal
from app.models.financial_score import Financial_Score
from app.models.anomaly import Anomaly
from app.models.balance_projection import Balance_Projection
from app.repositories.financial_score_repository import Financial_Score_Repository
from app.repositories.anomaly_repository import Anomaly_Repository
from app.repositories.balance_projection_repository import Balance_Projection_Repository

router = APIRouter(prefix="/analytics", tags=["analytics"])

score_repo      = Financial_Score_Repository()
anomaly_repo    = Anomaly_Repository()
projection_repo = Balance_Projection_Repository()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _month_range(year: int, month: int):
    """Retorna (start_dt, end_dt) para o mês."""
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end


def _get_type_map(db: Session) -> Dict[int, str]:
    types = db.query(Transaction_Type).all()
    return {t.id: t.description.lower() for t in types}


def _get_category_map(db: Session) -> Dict[int, str]:
    cats = db.query(Transaction_Category).all()
    return {c.id: c.description for c in cats}


def _transactions_in_month(db: Session, user_id: int, year: int, month: int):
    start, end = _month_range(year, month)
    return (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
        .all()
    )


def _classify_tx(tx: Transaction, type_map: Dict[int, str]):
    desc = type_map.get(tx.transaction_type_id, "")
    val  = float(tx.transaction_value)
    if "entrada" in desc or "receita" in desc or "salário" in desc or val > 0:
        return "receita"
    if "investimento" in desc or "invest" in desc:
        return "investimento"
    return "despesa"


# ── Cálculo principal ─────────────────────────────────────────────────────────

def _compute_indicators(
    db: Session,
    user_id: int,
    year: int,
    month: int,
    type_map: Dict[int, str],
    cat_map: Dict[int, str],
) -> Dict[str, Any]:

    txs = _transactions_in_month(db, user_id, year, month)

    receitas      = sum(abs(float(t.transaction_value)) for t in txs if _classify_tx(t, type_map) == "receita")
    despesas      = sum(abs(float(t.transaction_value)) for t in txs if _classify_tx(t, type_map) == "despesa")
    investimentos = sum(abs(float(t.transaction_value)) for t in txs if _classify_tx(t, type_map) == "investimento")

    # ── 1. Expense-income ratio ──────────────────────────────────────────────
    expense_income_ratio = round(despesas / receitas, 4) if receitas > 0 else 1.0

    # ── 2. Savings rate ──────────────────────────────────────────────────────
    saldo_mes   = receitas - despesas - investimentos
    savings_rate = round((saldo_mes / receitas) * 100, 2) if receitas > 0 else 0.0

    # ── 3. Burn rate trend (vs média últimos 3 meses) ────────────────────────
    despesas_hist = []
    for offset in range(1, 4):
        m = month - offset
        y = year
        while m <= 0:
            m += 12
            y -= 1
        txs_h = _transactions_in_month(db, user_id, y, m)
        desp_h = sum(abs(float(t.transaction_value)) for t in txs_h if _classify_tx(t, type_map) == "despesa")
        if desp_h > 0:
            despesas_hist.append(desp_h)

    media_hist = statistics.mean(despesas_hist) if despesas_hist else despesas
    burn_rate_trend = round(((despesas - media_hist) / media_hist) * 100, 2) if media_hist > 0 else 0.0

    # ── 4. Category concentration (HHI) ─────────────────────────────────────
    cat_spending: Dict[int, float] = defaultdict(float)
    for t in txs:
        if _classify_tx(t, type_map) == "despesa":
            cat_spending[t.transaction_category_id] += abs(float(t.transaction_value))

    total_desp = sum(cat_spending.values()) or 1
    hhi = round(sum((v / total_desp) ** 2 for v in cat_spending.values()) * 100, 2)

    # ── 5. Investment rate ───────────────────────────────────────────────────
    investment_rate = round((investimentos / receitas) * 100, 2) if receitas > 0 else 0.0

    # ── 6. Emergency months ──────────────────────────────────────────────────
    # Soma saldo de investimentos ativos com liquidez diária
    inv_liquidos = (
        db.query(func.sum(Investment.invested_value))
        .filter(Investment.user_id == user_id, Investment.status == "ativo")
        .scalar()
    ) or 0

    media_despesa_mensal = statistics.mean(despesas_hist + [despesas]) if despesas > 0 else 1
    emergency_months = round(float(inv_liquidos) / media_despesa_mensal, 1) if media_despesa_mensal > 0 else 0.0

    # ── 7. Goal coverage ─────────────────────────────────────────────────────
    metas_ativas = (
        db.query(Financial_Goal)
        .filter(Financial_Goal.user_id == user_id, Financial_Goal.status == "em_andamento")
        .all()
    )
    metas_com_aporte = sum(
        1 for m in metas_ativas
        if m.suggested_contribution and investimentos >= float(m.suggested_contribution)
    )
    goal_coverage = round((metas_com_aporte / len(metas_ativas)) * 100, 1) if metas_ativas else 100.0

    # ── 8. Anomaly detection por categoria ───────────────────────────────────
    # Média histórica por categoria (3 meses anteriores)
    cat_hist: Dict[int, List[float]] = defaultdict(list)
    for offset in range(1, 4):
        m = month - offset
        y = year
        while m <= 0:
            m += 12
            y -= 1
        txs_h = _transactions_in_month(db, user_id, y, m)
        for t in txs_h:
            if _classify_tx(t, type_map) == "despesa":
                cat_hist[t.transaction_category_id].append(abs(float(t.transaction_value)))

    anomalias: List[Dict] = []
    for cat_id, atual in cat_spending.items():
        hist = cat_hist.get(cat_id, [])
        if not hist:
            continue
        media = statistics.mean(hist)
        if media == 0:
            continue
        desvio = ((atual - media) / media) * 100
        if abs(desvio) >= 30:
            anomalias.append({
                "category_id": cat_id,
                "expected_value": round(media, 2),
                "actual_value": round(atual, 2),
                "deviation_percentage": round(desvio, 2),
                "status": "pendente",
            })

    anomaly_count = len(anomalias)

    # ── 9. Monthly volatility (CV do saldo dos últimos 6 meses) ──────────────
    saldos_hist = []
    for offset in range(1, 7):
        m = month - offset
        y = year
        while m <= 0:
            m += 12
            y -= 1
        txs_h = _transactions_in_month(db, user_id, y, m)
        r_h = sum(abs(float(t.transaction_value)) for t in txs_h if _classify_tx(t, type_map) == "receita")
        d_h = sum(abs(float(t.transaction_value)) for t in txs_h if _classify_tx(t, type_map) == "despesa")
        i_h = sum(abs(float(t.transaction_value)) for t in txs_h if _classify_tx(t, type_map) == "investimento")
        if r_h > 0:
            saldos_hist.append(r_h - d_h - i_h)

    if len(saldos_hist) >= 2:
        mean_s  = statistics.mean(saldos_hist)
        std_s   = statistics.stdev(saldos_hist)
        monthly_volatility = round((std_s / abs(mean_s)) * 100, 2) if mean_s != 0 else 0.0
    else:
        monthly_volatility = 0.0

    # ── 10. Score geral ponderado ─────────────────────────────────────────────
    # Cada componente contribui para o score 0-100:
    s_eir      = max(0, 100 - (expense_income_ratio * 100))    # menor ratio = melhor
    s_savings  = min(100, max(0, savings_rate * 2))             # 50% poup = 100 pts
    s_burn     = max(0, 100 - abs(burn_rate_trend))             # 0% tendência = 100 pts
    s_hhi      = max(0, 100 - hhi)                              # menor concentração = melhor
    s_invest   = min(100, investment_rate * 5)                  # 20% invest = 100 pts
    s_emerg    = min(100, emergency_months * 16.7)              # 6 meses = 100 pts
    s_goals    = goal_coverage                                  # já em 0-100
    s_anomaly  = max(0, 100 - (anomaly_count * 20))            # 0 anomalias = 100
    s_vol      = max(0, 100 - min(100, monthly_volatility))     # menor vol = melhor

    weights = {
        "expense_income": (s_eir,     0.20),
        "savings":        (s_savings, 0.15),
        "burn_trend":     (s_burn,    0.10),
        "concentration":  (s_hhi,     0.08),
        "investment":     (s_invest,  0.15),
        "emergency":      (s_emerg,   0.15),
        "goals":          (s_goals,   0.08),
        "anomalies":      (s_anomaly, 0.05),
        "volatility":     (s_vol,     0.04),
    }

    score_geral = round(sum(v * w for v, w in weights.values()), 2)

    components = {k: round(v, 2) for k, (v, _) in weights.items()}

    # ── Projeção de saldo 30 / 90 dias ───────────────────────────────────────
    media_entrada_diaria = receitas / 30
    media_saida_diaria   = (despesas + investimentos) / 30

    projecoes = []
    for dias in [30, 90]:
        saldo_atual    = saldo_mes
        saldo_proj     = saldo_atual + (media_entrada_diaria - media_saida_diaria) * dias
        projecoes.append({
            "period_days":       dias,
            "current_balance":   round(saldo_atual, 2),
            "projected_balance": round(saldo_proj, 2),
            "expected_inflows":  [{"label": "Receitas estimadas", "value": round(media_entrada_diaria * dias, 2)}],
            "expected_outflows": [{"label": "Despesas estimadas",   "value": round(media_saida_diaria * dias, 2)}],
        })

    return {
        # Campos do financial_score
        "score":                Decimal(str(score_geral)),
        "expense_income_ratio": Decimal(str(expense_income_ratio)),
        "emergency_reserve":    Decimal(str(round(float(inv_liquidos), 2))),
        "components":           components,
        # Indicadores detalhados (retornados no dashboard, não persistidos no score)
        "indicators": {
            "score_geral":           score_geral,
            "expense_income_ratio":  expense_income_ratio,
            "savings_rate":          savings_rate,
            "burn_rate_trend":       burn_rate_trend,
            "category_concentration": hhi,
            "investment_rate":       investment_rate,
            "emergency_months":      emergency_months,
            "goal_coverage":         goal_coverage,
            "anomaly_count":         anomaly_count,
            "monthly_volatility":    monthly_volatility,
        },
        "receitas":      round(receitas, 2),
        "despesas":      round(despesas, 2),
        "investimentos": round(investimentos, 2),
        "saldo":         round(saldo_mes, 2),
        "anomalias":     anomalias,
        "projecoes":     projecoes,
        "cat_spending":  {cat_map.get(k, str(k)): round(v, 2) for k, v in cat_spending.items()},
        "cat_hist_media":{cat_map.get(k, str(k)): round(statistics.mean(v), 2) for k, v in cat_hist.items() if v},
        "saldos_historico": saldos_hist,
        "mes": month,
        "ano": year,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/calculate",
    status_code=status.HTTP_200_OK,
    summary="Calcula e persiste os 10 indicadores financeiros do mês atual",
)
def calculate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now   = datetime.utcnow()
    year  = now.year
    month = now.month

    type_map = _get_type_map(db)
    cat_map  = _get_category_map(db)

    result = _compute_indicators(db, current_user.id, year, month, type_map, cat_map)

    # ── Upsert financial_score ────────────────────────────────────────────────
    existing_score = score_repo.get_by_month_year(db, current_user.id, month, year)
    score_payload  = {
        "user_id":             current_user.id,
        "month":               month,
        "year":                year,
        "score":               result["score"],
        "expense_income_ratio":result["expense_income_ratio"],
        "emergency_reserve":   result["emergency_reserve"],
        "components":          result["components"],
        "calculated_at":       now,
    }
    if existing_score:
        score_repo.update(db, existing_score, score_payload)
    else:
        score_repo.create(db, score_payload)

    # ── Grava anomalias (limpa as pendentes do mês antes) ────────────────────
    existing_anomalies = (
        db.query(Anomaly)
        .filter(
            Anomaly.user_id == current_user.id,
            Anomaly.status == "pendente",
        )
        .all()
    )
    for a in existing_anomalies:
        db.delete(a)
    db.commit()

    for a in result["anomalias"]:
        anomaly_repo.create(db, {**a, "user_id": current_user.id, "detected_at": now})

    # ── Grava projeções (30 e 90 dias) ────────────────────────────────────────
    for proj in result["projecoes"]:
        existing_proj = projection_repo.get_latest_by_period(db, current_user.id, proj["period_days"])
        proj_payload  = {**proj, "user_id": current_user.id, "generated_at": now}
        if existing_proj:
            projection_repo.update(db, existing_proj, proj_payload)
        else:
            projection_repo.create(db, proj_payload)

    return {
        "status":     "ok",
        "calculated_at": now.isoformat(),
        "indicators": result["indicators"],
        "score":      float(result["score"]),
    }


@router.get(
    "/dashboard/{year}/{month}",
    status_code=status.HTTP_200_OK,
    summary="Retorna snapshot completo de indicadores para um mês (recalcula se não existir)",
)
def get_dashboard(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    type_map = _get_type_map(db)
    cat_map  = _get_category_map(db)

    result = _compute_indicators(db, current_user.id, year, month, type_map, cat_map)

    # Histórico de scores dos últimos 6 meses para gráfico de evolução
    scores_hist = score_repo.get_all_by_user(db, current_user.id)
    score_history = [
        {
            "month":          s.month,
            "year":           s.year,
            "score":          float(s.score),
            "expense_ratio":  float(s.expense_income_ratio) if s.expense_income_ratio else None,
            "components":     s.components,
            "calculated_at":  s.calculated_at.isoformat(),
        }
        for s in sorted(scores_hist, key=lambda x: (x.year, x.month))[-12:]
    ]

    return {
        **result,
        "score_history": score_history,
    }