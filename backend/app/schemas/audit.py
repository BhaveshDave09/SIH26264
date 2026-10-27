from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class AuditEventResponse(BaseModel):
    id: int
    event_uuid: str
    actor_username: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: str
    timestamp: datetime
    details: str
    reason: Optional[str] = None
    previous_event_hash: str
    event_hash: str
    model_config = ConfigDict(from_attributes=True)

class AuditVerificationResponse(BaseModel):
    is_valid: bool
    total_events: int
    genesis_hash: str
    latest_hash: str
    broken_at_event_id: Optional[int] = None
    details: str
    verification_timestamp: datetime
