from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # None if sent to whole bureau
    bureau = Column(String(50), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    # OVERLAP_DETECTED, ACTION_CONFLICT, DEADLINE_APPROACHING, CASE_OVERDUE, TASK_ASSIGNED, ESCALATION
    notification_type = Column(String(50), nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
