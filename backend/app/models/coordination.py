from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.database import Base

class CoordinationTask(Base):
    __tablename__ = "coordination_tasks"

    id = Column(String(50), primary_key=True, index=True)  # e.g., COORD-2026-001
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    
    primary_case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    related_case_ids = Column(Text, nullable=False)  # JSON-encoded array of related case IDs
    
    originating_bureau = Column(String(50), nullable=False)
    participating_bureaus = Column(Text, nullable=False)  # JSON-encoded array of bureaus e.g. ["RB", "PGRC"]
    
    assigned_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    priority = Column(String(50), nullable=False, default="High")  # Critical, High, Medium, Low
    
    # Statuses: Open, Accepted, In Progress, Waiting for Response, Resolved, Cancelled
    status = Column(String(50), nullable=False, default="Open", index=True)
    
    due_date = Column(Date, nullable=False)
    resolution_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="coordination_tasks")
    primary_case = relationship("Case", foreign_keys=[primary_case_id])
    assigned_owner = relationship("User", back_populates="tasks_assigned", foreign_keys=[assigned_owner_id])
    creator = relationship("User", back_populates="tasks_created", foreign_keys=[created_by_id])
    updates = relationship("CoordinationUpdate", back_populates="task", cascade="all, delete-orphan", order_by="desc(CoordinationUpdate.timestamp)")

class CoordinationUpdate(Base):
    __tablename__ = "coordination_updates"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(50), ForeignKey("coordination_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String(50), nullable=False)
    update_type = Column(String(50), nullable=False)  # COMMENT, STATUS_CHANGE, REASSIGNMENT, HANDOFF
    remarks = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    task = relationship("CoordinationTask", back_populates="updates")
    user = relationship("User")
