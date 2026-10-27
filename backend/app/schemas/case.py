from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class CaseHistoryResponse(BaseModel):
    id: int
    actor_username: str
    action_type: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    previous_bureau: Optional[str] = None
    new_bureau: Optional[str] = None
    remarks: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class CaseBase(BaseModel):
    institution_id: int
    complainant_name: str
    complainant_type: str
    title: str
    description: str
    category: str
    priority: str = "Medium"
    assigned_bureau: str
    assigned_officer_id: Optional[int] = None
    expected_disposal_date: date
    next_action_required: Optional[str] = None

class CaseCreate(CaseBase):
    received_date: Optional[date] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    next_action_required: Optional[str] = None
    expected_disposal_date: Optional[date] = None

class CaseAssignRequest(BaseModel):
    assigned_officer_id: int
    remarks: str

class CaseTransferRequest(BaseModel):
    target_bureau: str
    mandatory_reason: str

class CaseStatusUpdateRequest(BaseModel):
    status: str
    mandatory_remark: str
    next_action_required: Optional[str] = None

class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    file_size_bytes: int
    content_type: str
    uploaded_by_username: str
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CaseResponse(BaseModel):
    id: str
    institution_id: int
    institution_name: Optional[str] = None
    institution_permanent_id: Optional[str] = None
    institution_state: Optional[str] = None
    institution_region: Optional[str] = None
    complainant_name: str
    complainant_type: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    assigned_bureau: str
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    received_date: date
    expected_disposal_date: date
    last_action: Optional[str] = None
    next_action_required: Optional[str] = None
    is_escalated: bool
    escalation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    history: List[CaseHistoryResponse] = []
    documents: List[DocumentResponse] = []
    has_potential_overlap: bool = False
    overlap_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class CaseListResponse(BaseModel):
    items: List[CaseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
