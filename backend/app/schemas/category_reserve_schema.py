from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class Category_Reserve_Schema_Create(BaseModel):
    category_id:    int
    month:          int
    year:           int
    reserved_value: float
    note:           Optional[str] = None


class Category_Reserve_Schema_Update(BaseModel):
    reserved_value: Optional[float] = None
    note:           Optional[str]   = None


class Category_Reserve_Schema_Response(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             int
    user_id:        int
    category_id:    int
    month:          int
    year:           int
    reserved_value: float
    note:           Optional[str]
    created_at:     datetime
    updated_at:     datetime


class Category_Reserve_Schema_Enriched(BaseModel):
    id:                  int
    user_id:             int
    category_id:         int
    category_name:       str
    category_acronym:    str
    month:               int
    year:                int
    reserved_value:      float
    spent_value:         float
    committed_value:     float
    available_value:     float
    spent_percentage:    float
    committed_percentage: float
    note:                Optional[str]


class Reserve_Summary_Schema(BaseModel):
    total_reserved:  float
    total_spent:     float
    total_committed: float
    total_available: float
    free_balance:    float
    reserves:        list[Category_Reserve_Schema_Enriched]

class Category_Reserve_Copy_Request(BaseModel):
    from_month: int
    from_year:  int
    to_month:   int
    to_year:    int

class Category_Reserve_Copy_Response(BaseModel):
    created: int
    skipped: int