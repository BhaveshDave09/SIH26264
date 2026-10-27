from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class CaseRelationshipResponse(BaseModel):
    id: int
    case_id_1: str
    case_id_2: str
    case_1_title: Optional[str] = None
    case_2_title: Optional[str] = None
    case_1_bureau: Optional[str] = None
    case_2_bureau: Optional[str] = None
    case_1_status: Optional[str] = None
    case_2_status: Optional[str] = None
    case_1_category: Optional[str] = None
    case_2_category: Optional[str] = None
    institution_id: int
    institution_name: Optional[str] = None
    institution_permanent_id: Optional[str] = None
    relationship_type: str
    similarity_score: float
    matching_signals: List[str] = []
    status: str
    explanation: str
    recommended_action: str
    reviewed_by: Optional[str] = None
    review_decision_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RelationshipReviewRequest(BaseModel):
    decision: str  # CONFIRMED_RELATED, MARKED_DUPLICATE, DISMISSED, COORDINATION_FLAGGED
    reason: str
    create_coordination_task: Optional[bool] = False
    task_owner_id: Optional[int] = None
    task_due_days: Optional[int] = 14
