from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.database import Base

class CaseRelationship(Base):
    __tablename__ = "case_relationships"

    id = Column(Integer, primary_key=True, index=True)
    case_id_1 = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id_2 = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    
    # Types: POTENTIAL_DUPLICATE, RELATED_CASE, ACTION_CONFLICT, SAME_INSTITUTION_COORDINATION
    relationship_type = Column(String(50), nullable=False)
    similarity_score = Column(Float, nullable=False, default=0.0)
    matching_signals = Column(Text, nullable=False)  # JSON-encoded array of signals
    
    # Review statuses: DETECTED, CONFIRMED_RELATED, MARKED_DUPLICATE, DISMISSED, COORDINATION_FLAGGED
    status = Column(String(50), nullable=False, default="DETECTED", index=True)
    explanation = Column(Text, nullable=False)
    recommended_action = Column(String(255), nullable=False)
    
    reviewed_by = Column(String(50), nullable=True)
    review_decision_reason = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case_1 = relationship("Case", foreign_keys=[case_id_1])
    case_2 = relationship("Case", foreign_keys=[case_id_2])
    institution = relationship("Institution")
