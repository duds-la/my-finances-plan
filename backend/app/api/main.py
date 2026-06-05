from fastapi import APIRouter

from app.api.routes import (
    login,
    transaction_type_route,
    transaction_category_route,
    transaction_route,
    # Módulo 2 — Investimentos
    investment_type_route,
    investment_route,
    income_type_route,
    income_route,
    investment_composition_route,
    # Módulo 3 — Planejamento
    budget_route,
    financial_goal_route,
    goal_contribution_route,
    simulation_route,
    achievement_route,
    user_achievement_route,
    installment_route,
    # Módulo 4 — Análise & Inteligência
    financial_score_route,
    anomaly_route,
    balance_projection_route,
    external_data_route,
    automation_rule_route,
    user_route,
    category_reserve_route,
    analytics_route

)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(user_route.router)
api_router.include_router(transaction_type_route.router)
api_router.include_router(transaction_category_route.router)
api_router.include_router(transaction_route.router)

# Módulo 2 — Investimentos
api_router.include_router(investment_type_route.router)
api_router.include_router(investment_route.router)
api_router.include_router(income_type_route.router)
api_router.include_router(income_route.router)
api_router.include_router(investment_composition_route.router)
# Módulo 3 — Planejamento
api_router.include_router(budget_route.router)
api_router.include_router(financial_goal_route.router)
api_router.include_router(goal_contribution_route.router)
api_router.include_router(simulation_route.router)
api_router.include_router(achievement_route.router)
api_router.include_router(user_achievement_route.router)
api_router.include_router(category_reserve_route.router)
api_router.include_router(installment_route.router)   # ← NOVO

# Módulo 4 — Análise & Inteligência
api_router.include_router(financial_score_route.router)
api_router.include_router(anomaly_route.router)
api_router.include_router(balance_projection_route.router)
api_router.include_router(external_data_route.router)
api_router.include_router(automation_rule_route.router)
api_router.include_router(analytics_route.router)
