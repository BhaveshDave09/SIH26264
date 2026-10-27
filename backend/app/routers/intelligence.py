import json
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.relationship import CaseRelationship
from backend.app.models.case import Case
from backend.app.models.institution import Institution
from backend.app.models.coordination import CoordinationTask, CoordinationUpdate
from backend.app.models.user import User
from backend.app.schemas.relationship import CaseRelationshipResponse, RelationshipReviewRequest
from backend.app.services.auth import get_current_user, require_write_access
from backend.app.services.audit import record_audit_event
from backend.app.services.intelligence import scan_case_for_overlaps

router = APIRouter(prefix="/intelligence", tags=["Cross-Bureau Intelligence"])

def format_relationship(rel: CaseRelationship, db: Session) -> dict:
    """Formats relationship object with full side-by-side case and institution context."""
    case1 = db.query(Case).filter(Case.id == rel.case_id_1).first()
    case2 = db.query(Case).filter(Case.id == rel.case_id_2).first()
    inst = db.query(Institution).filter(Institution.id == rel.institution_id).first()

    signals_list = []
    try:
        signals_list = json.loads(rel.matching_signals) if rel.matching_signals else []
    except Exception:
        signals_list = [rel.matching_signals]

    return {
        "id": rel.id,
        "case_id_1": rel.case_id_1,
        "case_id_2": rel.case_id_2,
        "case_1_title": case1.title if case1 else "Deleted Case",
        "case_2_title": case2.title if case2 else "Deleted Case",
        "case_1_bureau": case1.assigned_bureau if case1 else "N/A",
        "case_2_bureau": case2.assigned_bureau if case2 else "N/A",
        "case_1_status": case1.status if case1 else "N/A",
        "case_2_status": case2.status if case2 else "N/A",
        "case_1_category": case1.category if case1 else "N/A",
        "case_2_category": case2.category if case2 else "N/A",
        "institution_id": rel.institution_id,
        "institution_name": inst.name if inst else "Unknown",
        "institution_permanent_id": inst.permanent_id if inst else "N/A",
        "relationship_type": rel.relationship_type,
        "similarity_score": rel.similarity_score,
        "matching_signals": signals_list,
        "status": rel.status,
        "explanation": rel.explanation,
        "recommended_action": rel.recommended_action,
        "reviewed_by": rel.reviewed_by,
        "review_decision_reason": rel.review_decision_reason,
        "reviewed_at": rel.reviewed_at,
        "created_at": rel.created_at
    }

@router.get("/relationships", response_model=List[CaseRelationshipResponse])
def list_candidate_relationships(
    status: Optional[str] = Query(None, description="DETECTED, CONFIRMED_RELATED, DISMISSED, etc."),
    institution_id: Optional[int] = Query(None),
    case_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists cross-bureau candidate relationships with filtering."""
    query = db.query(CaseRelationship)

    if status and status != "ALL":
        query = query.filter(CaseRelationship.status == status)
    if institution_id:
        query = query.filter(CaseRelationship.institution_id == institution_id)
    if case_id:
        query = query.filter(
            or_(
                CaseRelationship.case_id_1 == case_id,
                CaseRelationship.case_id_2 == case_id
            )
        )

    relationships = query.order_by(CaseRelationship.created_at.desc()).all()
    return [format_relationship(r, db) for r in relationships]

@router.get("/relationships/{id}", response_model=CaseRelationshipResponse)
def get_candidate_relationship(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves full explanation and matching signals for a candidate relationship."""
    rel = db.query(CaseRelationship).filter(CaseRelationship.id == id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Candidate relationship not found")
    return format_relationship(rel, db)

@router.post("/relationships/{id}/review", response_model=CaseRelationshipResponse)
def review_candidate_relationship(
    id: int,
    payload: RelationshipReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """
    Submits official human-in-the-loop review decision:
    - CONFIRMED_RELATED: Verifies cross-bureau connection
    - MARKED_DUPLICATE: Identifies redundant filing
    - DISMISSED: Disregards match as unrelated
    - COORDINATION_FLAGGED: Flags for joint coordination task
    Optionally creates a new CoordinationTask seamlessly.
    """
    if not payload.reason or len(payload.reason.strip()) < 3:
        raise HTTPException(status_code=400, detail="Mandatory review justification is required.")

    valid_decisions = ["CONFIRMED_RELATED", "MARKED_DUPLICATE", "DISMISSED", "COORDINATION_FLAGGED"]
    if payload.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be one of {valid_decisions}")

    rel = db.query(CaseRelationship).filter(CaseRelationship.id == id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    rel.status = payload.decision
    rel.reviewed_by = current_user.username
    rel.review_decision_reason = payload.reason
    rel.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    # Record tamper-evident audit event
    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="RELATIONSHIP_REVIEWED",
        entity_type="CaseRelationship",
        entity_id=str(rel.id),
        details={
            "case_id_1": rel.case_id_1,
            "case_id_2": rel.case_id_2,
            "decision": payload.decision,
            "reason": payload.reason,
            "similarity_score": rel.similarity_score
        },
        reason=payload.reason
    )

    # If requested to spawn a coordination task
    if payload.create_coordination_task:
        case1 = db.query(Case).filter(Case.id == rel.case_id_1).first()
        case2 = db.query(Case).filter(Case.id == rel.case_id_2).first()
        inst = db.query(Institution).filter(Institution.id == rel.institution_id).first()

        task_owner_id = payload.task_owner_id or current_user.id
        due_days = payload.task_due_days or 14
        task_due = date.today() + timedelta(days=due_days)

        bureaus = list(set([case1.assigned_bureau, case2.assigned_bureau])) if case1 and case2 else ["RB", "PGRC"]
        task_count = db.query(CoordinationTask).count() + 1
        task_id = f"COORD-{date.today().year}-{str(task_count).zfill(3)}"

        coord_task = CoordinationTask(
            id=task_id,
            title=f"Joint Case Coordination: {rel.case_id_1} & {rel.case_id_2}",
            description=f"Cross-bureau coordination created following relationship review. Reviewer remarks: {payload.reason}. Explanations: {rel.explanation}",
            institution_id=rel.institution_id,
            primary_case_id=rel.case_id_1,
            related_case_ids=json.dumps([rel.case_id_2]),
            originating_bureau=case1.assigned_bureau if case1 else current_user.bureau,
            participating_bureaus=json.dumps(bureaus),
            assigned_owner_id=task_owner_id,
            created_by_id=current_user.id,
            priority="High",
            status="Open",
            due_date=task_due
        )
        db.add(coord_task)
        db.commit()

        # Add initial update
        update = CoordinationUpdate(
            task_id=coord_task.id,
            user_id=current_user.id,
            username=current_user.username,
            update_type="COMMENT",
            remarks=f"Task initiated automatically from Relationship Alert #{rel.id}. Justification: {payload.reason}",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(update)
        db.commit()

        record_audit_event(
            db=db,
            actor_username=current_user.username,
            actor_role=current_user.role,
            action="COORDINATION_TASK_CREATED",
            entity_type="CoordinationTask",
            entity_id=coord_task.id,
            details={"task_id": coord_task.id, "linked_cases": [rel.case_id_1, rel.case_id_2], "bureaus": bureaus},
            reason="Created from relationship review decision"
        )

    return format_relationship(rel, db)

@router.post("/scan")
def trigger_system_wide_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """Runs a complete system-wide cross-case intelligence scan across all active complaints."""
    active_cases = db.query(Case).filter(~Case.status.in_(["Disposed", "Closed"])).all()
    total_new_relationships = 0

    for c in active_cases:
        created = scan_case_for_overlaps(c, db)
        total_new_relationships += len(created)

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="SYSTEM_INTELLIGENCE_SCAN",
        entity_type="System",
        entity_id="ALL_CASES",
        details={"scanned_cases_count": len(active_cases), "new_overlaps_found": total_new_relationships},
        reason="Manual or scheduled intelligence scan triggered"
    )

    return {
        "scanned_cases": len(active_cases),
        "new_relationships_detected": total_new_relationships,
        "message": f"Scan completed across {len(active_cases)} cases. {total_new_relationships} new cross-bureau overlap candidates flagged."
    }
