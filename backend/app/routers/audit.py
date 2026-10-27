from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.audit import AuditEvent
from backend.app.models.user import User
from backend.app.schemas.audit import AuditEventResponse, AuditVerificationResponse
from backend.app.services.auth import get_current_user, require_roles
from backend.app.services.audit import verify_audit_chain, record_audit_event

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/events", response_model=List[AuditEventResponse])
def get_audit_trail(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    actor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns chronological audit trail with hash links."""
    query = db.query(AuditEvent)

    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditEvent.entity_id == str(entity_id))
    if action:
        query = query.filter(AuditEvent.action == action)
    if actor:
        query = query.filter(AuditEvent.actor_username == actor)

    return query.order_by(AuditEvent.id.desc()).limit(limit).all()

@router.get("/verify", response_model=AuditVerificationResponse)
def verify_audit_trail_integrity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cryptographically verifies the entire SHA-256 hash chain from genesis block to latest event.
    Returns whether the ledger is internally consistent, along with details and break location if any.
    """
    is_valid, total_events, broken_id, details, genesis_hash, latest_hash = verify_audit_chain(db)
    return {
        "is_valid": is_valid,
        "total_events": total_events,
        "genesis_hash": genesis_hash,
        "latest_hash": latest_hash,
        "broken_at_event_id": broken_id,
        "details": details,
        "verification_timestamp": datetime.now(timezone.utc)
    }

@router.post("/simulate-tamper")
def simulate_tamper_for_demo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """
    Demonstration endpoint: Artificially alters an event hash to prove that the Sentinel verification
    engine immediately detects tampering and pins the exact corrupted record.
    """
    last_event = db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
    if not last_event:
        raise HTTPException(status_code=400, detail="Audit trail is empty.")

    original_hash = last_event.event_hash
    # Corrupt the hash
    last_event.event_hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    db.commit()

    return {
        "message": f"Simulated tamper on Audit Event #{last_event.id}. Re-run '/api/v1/audit/verify' to witness cryptographic detection.",
        "tampered_event_id": last_event.id,
        "original_hash": original_hash,
        "corrupted_hash": last_event.event_hash
    }

@router.post("/restore-chain")
def restore_chain_for_demo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Recalculates and restores proper hash links across all audit events."""
    events = db.query(AuditEvent).order_by(AuditEvent.id.asc()).all()
    from backend.app.services.audit import GENESIS_HASH, compute_event_hash
    prev = GENESIS_HASH
    for ev in events:
        ev.previous_event_hash = prev
        ev.event_hash = compute_event_hash(prev, ev.details)
        prev = ev.event_hash
    db.commit()
    return {"message": "Audit chain re-anchored and cryptographically restored."}
