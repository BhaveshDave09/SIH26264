from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class SLACaseItem(BaseModel):
    id: str
    title: str
    institution_name: str
    institution_permanent_id: str
    assigned_bureau: str
    status: str
    priority: str
    received_date: date
    expected_disposal_date: date
    days_elapsed: int
    days_remaining: int
    is_overdue: bool
    is_approaching: bool
    is_escalated: bool
    assigned_officer_name: Optional[str] = None

class SLATaskItem(BaseModel):
    id: str
    title: str
    institution_name: str
    originating_bureau: str
    status: str
    priority: str
    due_date: date
    days_remaining: int
    is_overdue: bool
    assigned_owner_name: Optional[str] = None

class SLASummaryResponse(BaseModel):
    warning_threshold_days: int
    escalation_threshold_days: int
    total_overdue_cases: int
    total_approaching_cases: int
    total_overdue_tasks: int
    total_escalated_cases: int
    overdue_cases: List[SLACaseItem]
    approaching_cases: List[SLACaseItem]
    overdue_tasks: List[SLATaskItem]
