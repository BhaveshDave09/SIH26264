from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date

class ReportSummaryItem(BaseModel):
    bureau: str
    total_received: int
    pending: int
    disposed: int
    overdue: int
    disposal_rate: float
    avg_age_days: float

class RegionSummaryItem(BaseModel):
    region: str
    total_institutions: int
    total_cases: int
    active_cases: int
    overdue_cases: int

class ReportResponse(BaseModel):
    bureau_summary: List[ReportSummaryItem]
    region_summary: List[RegionSummaryItem]
    total_cases_analyzed: int
    avg_resolution_days: float
    total_confirmed_overlaps: int
    total_coordination_tasks: int
    coordination_resolution_rate: float
