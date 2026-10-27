from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class InstitutionAliasResponse(BaseModel):
    id: int
    alias_name: str
    model_config = ConfigDict(from_attributes=True)

class InstitutionBase(BaseModel):
    permanent_id: str
    name: str
    address: str
    state: str
    region: str
    category: str = "Engineering & Technology"
    status: str = "Active"

class InstitutionCreate(InstitutionBase):
    aliases: Optional[List[str]] = []

class InstitutionResponse(InstitutionBase):
    id: int
    normalized_name: str
    aliases: List[InstitutionAliasResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InstitutionDetailResponse(InstitutionResponse):
    total_cases: int = 0
    cases_by_status: dict = {}
    cases_by_bureau: dict = {}
    active_coordination_count: int = 0
    overlap_alerts_count: int = 0
