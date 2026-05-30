from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime


class Simulation_Schema_Base(BaseModel):
    simulation_type: str
    parameters: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None


class Simulation_Schema_Create(Simulation_Schema_Base):
    pass


class Simulation_Schema_Update(BaseModel):
    simulation_type: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None


class Simulation_Schema_Response(Simulation_Schema_Base):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
