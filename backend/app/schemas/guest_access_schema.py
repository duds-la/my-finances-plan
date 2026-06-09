from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class Guest_Access_Schema_Create(BaseModel):
    """
    Cria um convidado e define os itens compartilhados.
    O backend cria o User convidado + o registro guest_access atomicamente.
    """
    guest_name:    str           # login do convidado (será o `name` do User)
    guest_password: str          # senha do convidado

    allowed_modules:       List[str] = []   # ["metas", "investimentos"]
    shared_goal_ids:       List[int] = []
    shared_investment_ids: List[int] = []


class Guest_Access_Schema_Update(BaseModel):
    allowed_modules:       Optional[List[str]] = None
    shared_goal_ids:       Optional[List[int]] = None
    shared_investment_ids: Optional[List[int]] = None
    is_active:             Optional[bool]      = None
    guest_password:        Optional[str]       = None   # troca senha do convidado


class Guest_User_Info(BaseModel):
    id:       int
    name:     str
    is_guest: bool

    class Config:
        from_attributes = True


class Guest_Access_Schema_Response(BaseModel):
    id:          int
    owner_id:    int
    guest_id:    int
    guest:       Guest_User_Info

    allowed_modules:       List[str]
    shared_goal_ids:       List[int]
    shared_investment_ids: List[int]
    is_active:  bool
    created_at: datetime

    class Config:
        from_attributes = True
