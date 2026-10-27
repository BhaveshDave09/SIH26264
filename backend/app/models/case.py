from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(50), primary_key=True, index=True)  # e.g., AICTE/RB/2026/001
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    
    complainant_name = Column(String(150), nullable=False)
    complainant_type = Column(String(50), nullable=False)  # Student, Faculty, Parent, Anonymous, Public, Institution
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)  # Fee Overcharging, Unapproved Courses, Faculty Exploitation, etc.
    priority = Column(String(50), nullable=False, default="Medium")  # Critical, High, Medium, Low
    
    # Statuses: Received, Pending Review, Under Process, Transferred, Escalated, Disposed, Closed
    status = Column(String(50), nullable=False, default="Received", index=True)
    
    # Bureaus: RB, PGRC, APPROVAL_BUREAU, FINANCE_BUREAU
    assigned_bureau = Column(String(50), nullable=False, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    received_date = Column(Date, nullable=False)
    expected_disposal_date = Column(Date, nullable=False)
    
    last_action = Column(String(255), nullable=True)
    next_action_required = Column(String(255), nullable=True)
    
    is_escalated = Column(Boolean, default=False)
    escalation_reason = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="cases")
    assigned_officer = relationship("User", back_populates="cases_assigned", foreign_keys=[assigned_officer_id])
    history = relationship("CaseHistory", back_populates="case", cascade="all, delete-orphan", order_by="desc(CaseHistory.timestamp)")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")

class CaseHistory(Base):
    __tablename__ = "case_histories"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_username = Column(String(50), nullable=False)
    action_type = Column(String(50), nullable=False)  # CREATED, ASSIGNED, TRANSFERRED, STATUS_CHANGE, ACTION_RECORDED, ESCALATED
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    previous_bureau = Column(String(50), nullable=True)
    new_bureau = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="history")
