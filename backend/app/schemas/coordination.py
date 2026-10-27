from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime

class CoordinationUpdateResponse(BaseModel):
    id: int
    task_id: str
    user_id: int
    username: str
    update_type: str
    remarks: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class CoordinationUpdateCreate(BaseModel):
    update_type: str = "COMMENT"  # COMMENT, STATUS_CHANGE, REASSIGNMENT, HANDOFF
    remarks: str
    new_status: Optional[str] = None
    new_owner_id: Optional[int] = None

class CoordinationTaskCreate(BaseModel):
    title: str
    description: str
    institution_id: int
    primary_case_id: str
    related_case_ids: List[str] = []
    originating_bureau: str
    participating_bureaus: List[str] = []
    assigned_owner_id: int
    priority: str = "High"
    due_date: date

class CoordinationTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    assigned_owner_id: Optional[int] = None
    resolution_notes: Optional[str] = None

class CoordinationTaskResponse(BaseModel):
    id: str
    title: str
    description: str
    institution_id: int
    institution_name: Optional[str] = None
    institution_permanent_id: Optional[str] = None
    primary_case_id: str
    related_case_ids: List[str] = []
    originating_bureau: str
    participating_bureaus: List[str] = []
    assigned_owner_id: int
    assigned_owner_name: Optional[str] = None
    created_by_id: int
    creator_name: Optional[str] = None
    priority: str
    status: str
    due_date: date
    is_overdue: bool = False
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    updates: List[CoordinationUpdateResponse] = []
    model_config = ConfigDict(from_attributes=True)
