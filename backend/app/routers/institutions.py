from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from backend.app.database import get_db
from backend.app.models.institution import Institution, InstitutionAlias
from backend.app.models.case import Case
from backend.app.models.relationship import CaseRelationship
from backend.app.models.coordination import CoordinationTask
from backend.app.models.user import User
from backend.app.schemas.institution import InstitutionResponse, InstitutionDetailResponse, InstitutionCreate
from backend.app.services.auth import get_current_user, require_write_access
from backend.app.services.audit import record_audit_event
from backend.app.services.intelligence import clean_text

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionResponse])
def list_institutions(
    q: Optional[str] = Query(None, description="Search term for name or AICTE permanent ID"),
    region: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists institutions with search and filtering."""
    query = db.query(Institution)

    # Regional officer scope check
    if current_user.role == "REGIONAL_OFFICER" and current_user.region != "ALL":
        query = query.filter(Institution.region == current_user.region)

    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Institution.name.ilike(search),
                Institution.permanent_id.ilike(search),
                Institution.state.ilike(search)
            )
        )
    if region and region != "ALL":
        query = query.filter(Institution.region == region)
    if state and state != "ALL":
        query = query.filter(Institution.state == state)
    if status and status != "ALL":
        query = query.filter(Institution.status == status)

    return query.order_by(Institution.name.asc()).all()

@router.get("/{id}", response_model=InstitutionDetailResponse)
def get_institution_360(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns complete Institution 360° Profile:
    - Institution metadata and aliases
    - Cases grouped by status & bureau
    - Active coordination tasks count
    - Potential cross-bureau overlap alerts count
    """
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Regional scope enforcement
    if current_user.role == "REGIONAL_OFFICER" and current_user.region != "ALL":
        if inst.region != current_user.region:
            raise HTTPException(status_code=403, detail="Forbidden: You only have access to your regional jurisdiction.")

    cases = db.query(Case).filter(Case.institution_id == id).all()
    total_cases = len(cases)

    cases_by_status = {}
    cases_by_bureau = {}
    for c in cases:
        cases_by_status[c.status] = cases_by_status.get(c.status, 0) + 1
        cases_by_bureau[c.assigned_bureau] = cases_by_bureau.get(c.assigned_bureau, 0) + 1

    active_coord = db.query(CoordinationTask).filter(
        CoordinationTask.institution_id == id,
        ~CoordinationTask.status.in_(["Resolved", "Cancelled"])
    ).count()

    overlap_alerts = db.query(CaseRelationship).filter(
        CaseRelationship.institution_id == id,
        CaseRelationship.status.in_(["DETECTED", "COORDINATION_FLAGGED"])
    ).count()

    return {
        "id": inst.id,
        "permanent_id": inst.permanent_id,
        "name": inst.name,
        "normalized_name": inst.normalized_name,
        "address": inst.address,
        "state": inst.state,
        "region": inst.region,
        "category": inst.category,
        "status": inst.status,
        "created_at": inst.created_at,
        "updated_at": inst.updated_at,
        "aliases": inst.aliases,
        "total_cases": total_cases,
        "cases_by_status": cases_by_status,
        "cases_by_bureau": cases_by_bureau,
        "active_coordination_count": active_coord,
        "overlap_alerts_count": overlap_alerts
    }

@router.post("", response_model=InstitutionResponse)
def create_institution(
    payload: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """Creates a new institution with unique permanent_id verification and alias indexing."""
    existing = db.query(Institution).filter(Institution.permanent_id == payload.permanent_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Institution with Permanent ID '{payload.permanent_id}' already exists: '{existing.name}'."
        )

    norm_name = clean_text(payload.name)
    inst = Institution(
        permanent_id=payload.permanent_id,
        name=payload.name,
        normalized_name=norm_name,
        address=payload.address,
        state=payload.state,
        region=payload.region,
        category=payload.category,
        status=payload.status
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)

    if payload.aliases:
        for alias in payload.aliases:
            if alias.strip():
                a_obj = InstitutionAlias(
                    institution_id=inst.id,
                    alias_name=alias.strip(),
                    normalized_alias=clean_text(alias.strip())
                )
                db.add(a_obj)
        db.commit()
        db.refresh(inst)

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="INSTITUTION_CREATED",
        entity_type="Institution",
        entity_id=str(inst.id),
        details={"name": inst.name, "permanent_id": inst.permanent_id, "region": inst.region},
        reason="New institution registered"
    )

    return inst
