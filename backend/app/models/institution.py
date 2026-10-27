from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.database import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    permanent_id = Column(String(50), unique=True, index=True, nullable=False)  # Primary linking signal
    name = Column(String(255), index=True, nullable=False)
    normalized_name = Column(String(255), index=True, nullable=False)
    address = Column(String(500), nullable=False)
    state = Column(String(100), nullable=False)
    region = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False, default="Engineering & Technology")
    status = Column(String(50), nullable=False, default="Active")  # Active, Under Scrutiny, Deficient
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    aliases = relationship("InstitutionAlias", back_populates="institution", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="institution")
    coordination_tasks = relationship("CoordinationTask", back_populates="institution")

class InstitutionAlias(Base):
    __tablename__ = "institution_aliases"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    alias_name = Column(String(255), nullable=False)
    normalized_alias = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="aliases")
