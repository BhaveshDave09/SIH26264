from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from backend.app.database import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_uuid = Column(String(36), unique=True, index=True, nullable=False)
    actor_username = Column(String(50), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)  # CASE_CREATED, CASE_TRANSFERRED, STATUS_UPDATED, etc.
    entity_type = Column(String(50), nullable=False)  # Case, CoordinationTask, CaseRelationship, User
    entity_id = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    details = Column(Text, nullable=False)  # Canonical JSON string of event payload
    reason = Column(Text, nullable=True)
    
    # Hash linkage
    previous_event_hash = Column(String(64), nullable=False)
    event_hash = Column(String(64), nullable=False, index=True)
