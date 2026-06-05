"""
analytics_route.py

Indicadores calculados:
  1. expense_income_ratio   — comprometimento da renda
  2. savings_rate           — taxa de poupança
  3. burn_rate_trend        — tendência de gastos vs 3 meses
  4. category_concentration — HHI de concentração por categoria
  5. investment_rate        — % da renda aportada em investimentos no mês
  6. emergency_months       — meses cobertos pela R.E (finalidade='R.E')
  7. goal_coverage          — % das metas com progresso suficiente
  8. anomaly_count          — categorias com desvio > 30%
  9. monthly_volatility     — coeficiente de variação do saldo
  10. score_geral           — ponderação dos anteriores

Endpoints:
  POST /api/v1/analytics/calculate
  GET  /api/v1/analytics/dashboard/{year}/{month}
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from decimal import Decimal
from collections import defaultdict
import statistics

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.transaction_type import Transaction_Type
from app.models.transaction_category import Transaction_Category
from app.models.investment import Investment
from app.models.income import Income
from app.models.income_type import Income_Type
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
    start = datetime(year, month, 1)
    end   = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
    return start, end


def _get_type_map(db: Session) -> Dict[int, str]:
    return {t.id: t.description.lower() for t in db.query(Transaction_Type).all()}


def _get_category_map(db: Session) -> Dict[int, Tuple[str, str]]:
    return {c.id: (c.description.lower(), c.acronym.lower().strip())
            for c in db.query(Transaction_Category).all()}


def _transactions_in_month(db, user_id, year, month):
    start, end = _month_range(year, month)
    return (db.query(Transaction)
            .filter(Transaction.user_id == user_id,
                    Transaction.transaction_date >= start,
                    Transaction.transaction_date < end)
            .all())


def _investments_aportados_no_mes(db, user_id, year, month) -> float:
    """
    Aportes do mês = novos investimentos criados no mês
                   + aportes adicionais via Income registrados no mês
    """
    start, end = _month_range(year, month)

    # Novos investimentos criados no mês
    novos = (db.query(func.sum(Investment.invested_value))
             .filter(Investment.user_id == user_id,
                     Investment.application_date >= start.date(),
                     Investment.application_date < end.date())
             .scalar()) or 0

    # Aportes adicionais via Income no mês
    aporte_ids = {t.id for t in db.query(Income_Type).all()
                  if "aporte" in t.description.lower()}

    inv_ids = [r.id for r in db.query(Investment.id)
               .filter(Investment.user_id == user_id).all()]

    aportes_adicionais = 0.0
    if inv_ids and aporte_ids:
        aportes_adicionais = (
            db.query(func.sum(Income.income_value))
            .filter(Income.investment_id.in_(inv_ids),
                    Income.income_type_id.in_(aporte_ids),
                    Income.income_date >= start.date(),
                    Income.income_date < end.date())
            .scalar()
        ) or 0

    return float(novos) + float(aportes_adicionais)


def _get_inv_tx_ids(db, user_id) -> set:
    rows = (db.query(Investment.transaction_id)
            .filter(Investment.user_id == user_id,
                    Investment.transaction_id.isnot(None))
            .all())
    return {r.transaction_id for r in rows}


INVEST_KW  = ("invest", "investimento", "aplicação", "aplicacao", "aporte")
RECEITA_KW = ("entrada", "receita", "salário", "salario")


def _classify_tx(tx, type_map, cat_map) -> str:
    tipo_desc         = type_map.get(tx.transaction_type_id, "")
    cat_desc, cat_sig = cat_map.get(tx.transaction_category_id, ("", ""))
    val = float(tx.transaction_value)

    if val > 0 or any(k in tipo_desc for k in RECEITA_KW):
        return "receita"
    if (any(k in tipo_desc for k in INVEST_KW)
            or any(k in cat_desc for k in INVEST_KW)
            or cat_sig == "inv"):
        return "investimento"
    return "despesa"


# ── Core ──────────────────────────────────────────────────────────────────────

def _compute_indicators(db, user_id, year, month, type_map, cat_map) -> Dict[str, Any]:
    txs        = _transactions_in_month(db, user_id, year, month)
    inv_tx_ids = _get_inv_tx_ids(db, user_id)

    receitas = sum(
        abs(float(t.transaction_value)) for t in txs
        if _classify_tx(t, type_map, cat_map) == "receita"
    )
    despesas = sum(
        abs(float(t.transaction_value)) for t in txs
        if _classify_tx(t, type_map, cat_map) != "receita"
        and t.id not in inv_tx_ids
    )
    investimentos = _investments_aportados_no_mes(db, user_id, year, month)

    # 1 — Comprometimento
    expense_income_ratio = round(despesas / receitas, 4) if receitas > 0 else 1.0

    # 2 — Poupança
    saldo_mes    = receitas - despesas
    savings_rate = round(((saldo_mes - investimentos) / receitas) * 100, 2) if receitas > 0 else 0.0

    # 3 — Tendência (histórico 3 meses, sem tx de investimento)
    despesas_hist = []
    for offset in range(1, 4):
        m, y = month - offset, year
        while m <= 0: m += 12; y -= 1
        txs_h  = _transactions_in_month(db, user_id, y, m)
        desp_h = sum(
            abs(float(t.transaction_value)) for t in txs_h
            if _classify_tx(t, type_map, cat_map) != "receita"
            and t.id not in inv_tx_ids
        )
        if desp_h > 0:
            despesas_hist.append(desp_h)

    media_hist      = statistics.mean(despesas_hist) if despesas_hist else despesas
    burn_rate_trend = round(((despesas - media_hist) / media_hist) * 100, 2) if media_hist > 0 else 0.0

    # 4 — HHI
    cat_spending: Dict[int, float] = defaultdict(float)
    for t in txs:
        if _classify_tx(t, type_map, cat_map) != "receita" and t.id not in inv_tx_ids:
            cat_spending[t.transaction_category_id] += abs(float(t.transaction_value))

    total_desp = sum(cat_spending.values()) or 1
    hhi = round(sum((v / total_desp) ** 2 for v in cat_spending.values()) * 100, 2)

    # 5 — Taxa de investimento
    investment_rate = round((investimentos / receitas) * 100, 2) if receitas > 0 else 0.0

    # 6 — Reserva de emergência (usa SOMENTE investimento com finalidade='R.E')
    re_inv = db.query(Investment).filter(
        Investment.user_id == user_id,
        Investment.finalidade == "R.E",
        Investment.status == "ativo",
    ).first()

    re_valor = float(re_inv.current_value or re_inv.invested_value or 0) if re_inv else 0.0

    media_despesa_mensal = (
        statistics.mean(despesas_hist) if despesas_hist
        else (despesas or 1)
    )
    emergency_months = round(re_valor / media_despesa_mensal, 1) if media_despesa_mensal > 0 else 0.0

    # 7 — Cobertura de metas
    metas_ativas = db.query(Financial_Goal).filter(
        Financial_Goal.user_id == user_id,
        Financial_Goal.status == "em_andamento",
    ).all()

    metas_com_progresso = 0
    for meta in metas_ativas:
        if meta.investment_id:
            inv_meta = db.get(Investment, meta.investment_id)
            if inv_meta:
                valor_atual  = float(inv_meta.current_value or inv_meta.invested_value or 0)
                valor_alvo   = float(meta.target_value or 1)
                if valor_atual / valor_alvo >= 0.1:   # pelo menos 10% da meta
                    metas_com_progresso += 1
        elif meta.suggested_contribution and investimentos >= float(meta.suggested_contribution):
            metas_com_progresso += 1

    goal_coverage = round((metas_com_progresso / len(metas_ativas)) * 100, 1) if metas_ativas else 100.0

    # 8 — Anomalias
    cat_hist: Dict[int, List[float]] = defaultdict(list)
    for offset in range(1, 4):
        m, y = month - offset, year
        while m <= 0: m += 12; y -= 1
        txs_h = _transactions_in_month(db, user_id, y, m)
        for t in txs_h:
            if _classify_tx(t, type_map, cat_map) != "receita" and t.id not in inv_tx_ids:
                cat_hist[t.transaction_category_id].append(abs(float(t.transaction_value)))

    anomalias = []
    for cat_id, atual in cat_spending.items():
        hist  = cat_hist.get(cat_id, [])
        media = statistics.mean(hist) if hist else None
        if not media or media == 0:
            continue
        desvio = ((atual - media) / media) * 100
        if abs(desvio) >= 30:
            anomalias.append({
                "category_id":          cat_id,
                "expected_value":       round(media, 2),
                "actual_value":         round(atual, 2),
                "deviation_percentage": round(desvio, 2),
                "status":               "pendente",
            })

    # 9 — Volatilidade
    saldos_hist = []
    for offset in range(1, 7):
        m, y = month - offset, year
        while m <= 0: m += 12; y -= 1
        txs_h = _transactions_in_month(db, user_id, y, m)
        r_h = sum(abs(float(t.transaction_value)) for t in txs_h if _classify_tx(t, type_map, cat_map) == "receita")
        d_h = sum(abs(float(t.transaction_value)) for t in txs_h
                  if _classify_tx(t, type_map, cat_map) != "receita" and t.id not in inv_tx_ids)
        i_h = _investments_aportados_no_mes(db, user_id, y, m)
        if r_h > 0:
            saldos_hist.append(r_h - d_h - i_h)

    if len(saldos_hist) >= 2:
        mean_s = statistics.mean(saldos_hist)
        std_s  = statistics.stdev(saldos_hist)
        monthly_volatility = round((std_s / abs(mean_s)) * 100, 2) if mean_s != 0 else 0.0
    else:
        monthly_volatility = 0.0

    # 10 — Score
    s_eir    = max(0, 100 - expense_income_ratio * 100)
    s_sav    = min(100, max(0, savings_rate * 2))
    s_burn   = max(0, 100 - abs(burn_rate_trend))
    s_hhi    = max(0, 100 - hhi)
    s_inv    = min(100, investment_rate * 5)
    s_emerg  = min(100, emergency_months * 16.7)
    s_goals  = goal_coverage
    s_anom   = max(0, 100 - len(anomalias) * 20)
    s_vol    = max(0, 100 - min(100, monthly_volatility))

    weights = {
        "expense_income": (s_eir,   0.20),
        "savings":        (s_sav,   0.15),
        "burn_trend":     (s_burn,  0.10),
        "concentration":  (s_hhi,   0.08),
        "investment":     (s_inv,   0.15),
        "emergency":      (s_emerg, 0.15),
        "goals":          (s_goals, 0.08),
        "anomalies":      (s_anom,  0.05),
        "volatility":     (s_vol,   0.04),
    }
    score_geral = round(sum(v * w for v, w in weights.values()), 2)
    components  = {k: round(v, 2) for k, (v, _) in weights.items()}

    # Nomes de categoria
    cat_name_map = {k: v[0].title() for k, v in cat_map.items()}

    # Patrimônio dos investimentos (current_value de todos os ativos)
    total_investido = (
        db.query(func.sum(Investment.current_value))
        .filter(Investment.user_id == user_id, Investment.status == "ativo")
        .scalar()
    ) or 0

    # Projeção 30/90 dias
    media_entrada_diaria = receitas / 30
    media_saida_diaria   = despesas / 30
    projecoes = []
    for dias in [30, 90]:
        saldo_proj = saldo_mes + (media_entrada_diaria - media_saida_diaria) * dias
        projecoes.append({
            "period_days":       dias,
            "current_balance":   round(saldo_mes, 2),
            "projected_balance": round(saldo_proj, 2),
        })

    # Progresso das metas (para o frontend)
    metas_progress = []
    for meta in metas_ativas:
        valor_atual = 0.0
        if meta.investment_id:
            inv_meta = db.get(Investment, meta.investment_id)
            if inv_meta:
                valor_atual = float(inv_meta.current_value or inv_meta.invested_value or 0)
        valor_alvo = float(meta.target_value or 0)
        pct = round((valor_atual / valor_alvo) * 100, 1) if valor_alvo > 0 else 0.0
        metas_progress.append({
            "id":           meta.id,
            "name":         meta.title,
            "target_value": valor_alvo,
            "current":      round(valor_atual, 2),
            "pct":          pct,
            "target_date":  meta.deadline.isoformat() if meta.deadline else None,
            "investment_id": meta.investment_id,
        })

    return {
        "score":                Decimal(str(score_geral)),
        "expense_income_ratio": Decimal(str(expense_income_ratio)),
        "emergency_reserve":    Decimal(str(round(re_valor, 2))),
        "components":           components,
        "indicators": {
            "score_geral":            score_geral,
            "expense_income_ratio":   expense_income_ratio,
            "savings_rate":           savings_rate,
            "burn_rate_trend":        burn_rate_trend,
            "category_concentration": hhi,
            "investment_rate":        investment_rate,
            "emergency_months":       emergency_months,
            "goal_coverage":          goal_coverage,
            "anomaly_count":          len(anomalias),
            "monthly_volatility":     monthly_volatility,
        },
        "receitas":         round(receitas, 2),
        "despesas":         round(despesas, 2),
        "investimentos":    round(investimentos, 2),
        "saldo":            round(saldo_mes, 2),
        "total_investido":  round(float(total_investido), 2),
        "re_valor":         round(re_valor, 2),
        "anomalias":        anomalias,
        "projecoes":        projecoes,
        "metas_progress":   metas_progress,
        "cat_spending":     {cat_name_map.get(k, str(k)): round(v, 2) for k, v in cat_spending.items()},
        "cat_hist_media":   {cat_name_map.get(k, str(k)): round(statistics.mean(v), 2)
                             for k, v in cat_hist.items() if v},
        "saldos_historico": saldos_hist,
        "mes":  month,
        "ano":  year,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/calculate", status_code=status.HTTP_200_OK)
def calculate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now   = datetime.utcnow()
    year, month = now.year, now.month

    type_map = _get_type_map(db)
    cat_map  = _get_category_map(db)
    result   = _compute_indicators(db, current_user.id, year, month, type_map, cat_map)

    # Upsert score
    existing = score_repo.get_by_month_year(db, current_user.id, month, year)
    payload  = {
        "user_id": current_user.id, "month": month, "year": year,
        "score": result["score"], "expense_income_ratio": result["expense_income_ratio"],
        "emergency_reserve": result["emergency_reserve"],
        "components": result["components"], "calculated_at": now,
    }
    score_repo.update(db, existing, payload) if existing else score_repo.create(db, payload)

    # Anomalias
    db.query(Anomaly).filter(Anomaly.user_id == current_user.id,
                             Anomaly.status == "pendente").delete()
    db.commit()
    for a in result["anomalias"]:
        anomaly_repo.create(db, {**a, "user_id": current_user.id, "detected_at": now})

    # Projeções
    for proj in result["projecoes"]:
        existing_p = projection_repo.get_latest_by_period(db, current_user.id, proj["period_days"])
        pp = {**proj, "user_id": current_user.id, "generated_at": now}
        projection_repo.update(db, existing_p, pp) if existing_p else projection_repo.create(db, pp)

    return {
        "status": "ok", "calculated_at": now.isoformat(),
        "score": float(result["score"]),
        "indicators": result["indicators"],
    }


@router.get("/dashboard/{year}/{month}", status_code=status.HTTP_200_OK)
def get_dashboard(
    year: int, month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    type_map = _get_type_map(db)
    cat_map  = _get_category_map(db)
    result   = _compute_indicators(db, current_user.id, year, month, type_map, cat_map)

    scores_hist = score_repo.get_all_by_user(db, current_user.id)
    score_history = [
        {"month": s.month, "year": s.year, "score": float(s.score),
         "components": s.components, "calculated_at": s.calculated_at.isoformat()}
        for s in sorted(scores_hist, key=lambda x: (x.year, x.month))[-12:]
    ]

    return {**result, "score_history": score_history}