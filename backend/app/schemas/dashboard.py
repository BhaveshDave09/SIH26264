from pydantic import BaseModel
from typing import List, Dict, Any

class WorkloadItem(BaseModel):
    bureau: str
    total_cases: int
    pending_cases: int
    disposed_cases: int
    overdue_cases: int

class TrendItem(BaseModel):
    month: str
    received_count: int
    disposed_count: int

class AgeingBucket(BaseModel):
    bucket: str
    count: int

class CategoryBreakdown(BaseModel):
    category: str
    count: int

class RecentActionItem(BaseModel):
    id: int
    case_id: str
    actor: str
    action_type: str
    remarks: str
    timestamp: str

class HighPriorityItem(BaseModel):
    id: str
    title: str
    institution_name: str
    priority: str
    status: str
    assigned_bureau: str
    is_overdue: bool
    has_overlap_alert: bool

class DashboardStatsResponse(BaseModel):
    total_cases: int
    pending_cases: int
    under_process_cases: int
    disposed_cases: int
    transferred_cases: int
    overdue_cases: int
    approaching_deadline_cases: int
    open_coordination_alerts: int
    active_coordination_tasks: int
    coordination_health_score: int
    coordination_health_explanation: str
    bureau_workload: List[WorkloadItem]
    monthly_trends: List[TrendItem]
    ageing_distribution: List[AgeingBucket]
    category_distribution: List[CategoryBreakdown]
    recent_actions: List[RecentActionItem]
    high_priority_items: List[HighPriorityItem]
