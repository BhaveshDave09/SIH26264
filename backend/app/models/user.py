from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    salt = Column(String(64), nullable=False)
    
    # Roles: SUPER_ADMIN, BUREAU_HEAD, BUREAU_OFFICER, REGIONAL_OFFICER, READ_ONLY
    role = Column(String(50), nullable=False)
    
    # Bureaus: RB (Regulation Bureau), PGRC (Public Grievance Redressal Cell), APPROVAL_BUREAU, FINANCE_BUREAU, ALL
    bureau = Column(String(50), nullable=False, default="ALL")
    
    # Regions: North, South, East, West, Central, North-West, ALL
    region = Column(String(50), nullable=False, default="ALL")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    cases_assigned = relationship("Case", back_populates="assigned_officer", foreign_keys="Case.assigned_officer_id")
    tasks_assigned = relationship("CoordinationTask", back_populates="assigned_owner", foreign_keys="CoordinationTask.assigned_owner_id")
    tasks_created = relationship("CoordinationTask", back_populates="creator", foreign_keys="CoordinationTask.created_by_id")
