import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.case import Case, CaseHistory
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.relationship import CaseRelationship
from backend.app.schemas.case import (
    CaseResponse, CaseListResponse, CaseCreate, CaseUpdate,
    CaseAssignRequest, CaseTransferRequest, CaseStatusUpdateRequest
)
from backend.app.services.auth import get_current_user, require_write_access, check_bureau_and_region_access
from backend.app.services.audit import record_audit_event
from backend.app.services.intelligence import scan_case_for_overlaps

router = APIRouter(prefix="/cases", tags=["Cases"])

def enrich_case_response(case: Case, db: Session) -> dict:
    """Enriches Case object with related institution, officer, and overlap metadata."""
    inst = case.institution
    officer = case.assigned_officer
    
    # Check for potential overlap
    overlap_count = db.query(CaseRelationship).filter(
        ((CaseRelationship.case_id_1 == case.id) | (CaseRelationship.case_id_2 == case.id)),
        CaseRelationship.status.in_(["DETECTED", "COORDINATION_FLAGGED", "CONFIRMED_RELATED"])
    ).count()

    return {
        "id": case.id,
        "institution_id": case.institution_id,
        "institution_name": inst.name if inst else "Unknown",
        "institution_permanent_id": inst.permanent_id if inst else "N/A",
        "institution_state": inst.state if inst else "N/A",
        "institution_region": inst.region if inst else "N/A",
        "complainant_name": case.complainant_name,
        "complainant_type": case.complainant_type,
        "title": case.title,
        "description": case.description,
        "category": case.category,
        "priority": case.priority,
        "status": case.status,
        "assigned_bureau": case.assigned_bureau,
        "assigned_officer_id": case.assigned_officer_id,
        "assigned_officer_name": officer.full_name if officer else "Unassigned",
        "received_date": case.received_date,
        "expected_disposal_date": case.expected_disposal_date,
        "last_action": case.last_action,
        "next_action_required": case.next_action_required,
        "is_escalated": case.is_escalated,
        "escalation_reason": case.escalation_reason,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "history": case.history,
        "documents": case.documents,
        "has_potential_overlap": (overlap_count > 0),
        "overlap_count": overlap_count
    }

@router.get("", response_model=CaseListResponse)
def list_cases(
    q: Optional[str] = Query(None, description="Search across ID, Title, Institution"),
    bureau: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    has_overlap: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists cases with comprehensive filtering and role/bureau/regional authorization."""
    query = db.query(Case).join(Institution, Case.institution_id == Institution.id)

    # Authorization scope
    if current_user.role == "REGIONAL_OFFICER" and current_user.region != "ALL":
        query = query.filter(Institution.region == current_user.region)
    elif current_user.role in ["BUREAU_OFFICER", "BUREAU_HEAD"] and current_user.bureau != "ALL":
        # Allow cross-bureau visibility for intelligence/coordination, but filter default view if specified
        pass

    if bureau and bureau != "ALL":
        query = query.filter(Case.assigned_bureau == bureau)
    if status and status != "ALL":
        query = query.filter(Case.status == status)
    if priority and priority != "ALL":
        query = query.filter(Case.priority == priority)
    if category and category != "ALL":
        query = query.filter(Case.category == category)
    if region and region != "ALL":
        query = query.filter(Institution.region == region)
    if institution_id:
        query = query.filter(Case.institution_id == institution_id)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Case.id.ilike(search_pattern),
                Case.title.ilike(search_pattern),
                Institution.name.ilike(search_pattern),
                Institution.permanent_id.ilike(search_pattern)
            )
        )

    if is_overdue is not None:
        today = date.today()
        if is_overdue:
            query = query.filter(Case.expected_disposal_date < today, ~Case.status.in_(["Disposed", "Closed"]))
        else:
            query = query.filter(or_(Case.expected_disposal_date >= today, Case.status.in_(["Disposed", "Closed"])))

    total = query.count()
    items_raw = query.order_by(Case.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    items = [enrich_case_response(c, db) for c in items_raw]
    
    if has_overlap is not None:
        items = [item for item in items if item["has_potential_overlap"] == has_overlap]
        total = len(items)

    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{id}", response_model=CaseResponse)
def get_case_detail(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieves single case details with timeline, officer assignment, and overlap intelligence."""
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Authorization scope check
    if not check_bureau_and_region_access(current_user, case.assigned_bureau, case.institution.region):
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to view cases outside your jurisdiction.")

    return enrich_case_response(case, db)

@router.post("", response_model=CaseResponse)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """
    Creates a new complaint case:
    1. Validates institution reference
    2. Generates unique Case ID (e.g. AICTE/RB/2026/XXX)
    3. Triggers Cross-Bureau Case Intelligence Engine to scan for duplicates / related cases
    4. Records creation in CaseHistory and hash-linked audit log
    """
    inst = db.query(Institution).filter(Institution.id == payload.institution_id).first()
    if not inst:
        raise HTTPException(status_code=400, detail="Invalid institution reference")

    # Generate sequential or unique Case ID
    year = date.today().year
    bureau_code = payload.assigned_bureau.replace(" ", "_")
    count_today = db.query(Case).filter(Case.assigned_bureau == payload.assigned_bureau).count() + 1
    generated_id = f"AICTE/{bureau_code}/{year}/{str(count_today).zfill(3)}"

    # Ensure uniqueness
    if db.query(Case).filter(Case.id == generated_id).first():
        generated_id = f"AICTE/{bureau_code}/{year}/{uuid.uuid4().hex[:6].upper()}"

    recv_date = payload.received_date or date.today()

    new_case = Case(
        id=generated_id,
        institution_id=payload.institution_id,
        complainant_name=payload.complainant_name,
        complainant_type=payload.complainant_type,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        status="Received",
        assigned_bureau=payload.assigned_bureau,
        assigned_officer_id=payload.assigned_officer_id,
        received_date=recv_date,
        expected_disposal_date=payload.expected_disposal_date,
        last_action=f"Complaint lodged via {payload.complainant_type}",
        next_action_required=payload.next_action_required or "Initial scrutiny & officer allocation",
        is_escalated=False
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Initial history
    hist = CaseHistory(
        case_id=new_case.id,
        actor_username=current_user.username,
        action_type="CREATED",
        new_status="Received",
        new_bureau=new_case.assigned_bureau,
        remarks=f"Case initialized and assigned to {new_case.assigned_bureau}.",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(hist)
    db.commit()

    # Audit record
    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="CASE_CREATED",
        entity_type="Case",
        entity_id=new_case.id,
        details={
            "case_id": new_case.id,
            "institution": inst.name,
            "permanent_id": inst.permanent_id,
            "bureau": new_case.assigned_bureau,
            "category": new_case.category,
            "priority": new_case.priority
        },
        reason="New complaint registered in sentinel platform"
    )

    # Trigger Cross-Bureau Case Intelligence Engine
    scan_case_for_overlaps(new_case, db)

    return enrich_case_response(new_case, db)

@router.put("/{id}", response_model=CaseResponse)
def update_case(
    id: str,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """Updates permitted case details and records change in audit history."""
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not check_bureau_and_region_access(current_user, case.assigned_bureau, case.institution.region):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify cases outside your assigned bureau.")

    changes = {}
    if payload.title is not None and payload.title != case.title:
        changes["title"] = {"old": case.title, "new": payload.title}
        case.title = payload.title
    if payload.description is not None and payload.description != case.description:
        changes["description"] = "Updated description"
        case.description = payload.description
    if payload.category is not None and payload.category != case.category:
        changes["category"] = {"old": case.category, "new": payload.category}
        case.category = payload.category
    if payload.priority is not None and payload.priority != case.priority:
        changes["priority"] = {"old": case.priority, "new": payload.priority}
        case.priority = payload.priority
    if payload.next_action_required is not None:
        case.next_action_required = payload.next_action_required
    if payload.expected_disposal_date is not None:
        changes["expected_disposal_date"] = {"old": str(case.expected_disposal_date), "new": str(payload.expected_disposal_date)}
        case.expected_disposal_date = payload.expected_disposal_date

    case.updated_at = datetime.now(timezone.utc)
    db.commit()

    if changes:
        record_audit_event(
            db=db,
            actor_username=current_user.username,
            actor_role=current_user.role,
            action="CASE_UPDATED",
            entity_type="Case",
            entity_id=case.id,
            details=changes,
            reason="Case details updated"
        )
        # Rescan for overlaps if category or description changed
        if "category" in changes or "description" in changes:
            scan_case_for_overlaps(case, db)

    return enrich_case_response(case, db)

@router.post("/{id}/assign", response_model=CaseResponse)
def assign_officer(
    id: str,
    payload: CaseAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """Assigns or reassigns an investigating officer to the case."""
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    officer = db.query(User).filter(User.id == payload.assigned_officer_id).first()
    if not officer:
        raise HTTPException(status_code=400, detail="Invalid officer ID")

    prev_officer = case.assigned_officer.full_name if case.assigned_officer else "None"
    case.assigned_officer_id = officer.id
    case.last_action = f"Assigned to {officer.full_name} ({officer.role})"
    case.updated_at = datetime.now(timezone.utc)

    hist = CaseHistory(
        case_id=case.id,
        actor_username=current_user.username,
        action_type="ASSIGNED",
        remarks=f"Reassigned from {prev_officer} to {officer.full_name}. Remarks: {payload.remarks}",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(hist)
    db.commit()

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="CASE_ASSIGNED",
        entity_type="Case",
        entity_id=case.id,
        details={"officer_id": officer.id, "officer_name": officer.full_name, "remarks": payload.remarks},
        reason=payload.remarks
    )

    return enrich_case_response(case, db)

@router.post("/{id}/transfer", response_model=CaseResponse)
def transfer_bureau(
    id: str,
    payload: CaseTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """
    Transfers a case between Bureaus with mandatory justification.
    Maintains full audit and prevents erasing previous history.
    """
    if not payload.mandatory_reason or len(payload.mandatory_reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A detailed mandatory reason is required for inter-bureau transfer.")

    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    prev_bureau = case.assigned_bureau
    case.assigned_bureau = payload.target_bureau
    case.status = "Transferred"
    case.last_action = f"Transferred from {prev_bureau} to {payload.target_bureau}"
    case.updated_at = datetime.now(timezone.utc)

    hist = CaseHistory(
        case_id=case.id,
        actor_username=current_user.username,
        action_type="TRANSFERRED",
        previous_bureau=prev_bureau,
        new_bureau=payload.target_bureau,
        previous_status=case.status,
        new_status="Transferred",
        remarks=f"Inter-bureau transfer reason: {payload.mandatory_reason}",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(hist)
    db.commit()

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="CASE_TRANSFERRED",
        entity_type="Case",
        entity_id=case.id,
        details={"from_bureau": prev_bureau, "to_bureau": payload.target_bureau, "reason": payload.mandatory_reason},
        reason=payload.mandatory_reason
    )

    # Rescan overlaps with new bureau allocation
    scan_case_for_overlaps(case, db)

    return enrich_case_response(case, db)

@router.post("/{id}/status", response_model=CaseResponse)
def update_case_status(
    id: str,
    payload: CaseStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """
    Updates case status with mandatory action remarks.
    Validates legal workflow progression and persists audit trail.
    """
    if not payload.mandatory_remark or len(payload.mandatory_remark.strip()) < 3:
        raise HTTPException(status_code=400, detail="A mandatory action remark is required to record status updates.")

    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    prev_status = case.status
    case.status = payload.status
    case.last_action = f"Status updated to '{payload.status}' by {current_user.username}"
    if payload.next_action_required:
        case.next_action_required = payload.next_action_required
    case.updated_at = datetime.now(timezone.utc)

    hist = CaseHistory(
        case_id=case.id,
        actor_username=current_user.username,
        action_type="STATUS_CHANGE",
        previous_status=prev_status,
        new_status=payload.status,
        remarks=payload.mandatory_remark,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(hist)
    db.commit()

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="CASE_STATUS_CHANGED",
        entity_type="Case",
        entity_id=case.id,
        details={"previous_status": prev_status, "new_status": payload.status, "remarks": payload.mandatory_remark},
        reason=payload.mandatory_remark
    )

    return enrich_case_response(case, db)
