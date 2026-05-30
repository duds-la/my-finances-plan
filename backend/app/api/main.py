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
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(transaction_type_route.router)
api_router.include_router(transaction_category_route.router)
api_router.include_router(transaction_route.router)

# Módulo 2 — Investimentos
api_router.include_router(investment_type_route.router)
api_router.include_router(investment_route.router)
api_router.include_router(income_type_route.router)
api_router.include_router(income_route.router)
api_router.include_router(investment_composition_route.router)