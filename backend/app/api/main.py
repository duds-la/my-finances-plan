from fastapi import APIRouter

from app.api.routes import login, transaction_type_route,transaction_category_route
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(transaction_type_route.router)
api_router.include_router(transaction_category_route.router)


#if settings.ENVIRONMENT == "local":
#    api_router.include_router(private.router)
