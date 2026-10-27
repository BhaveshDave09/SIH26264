import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.audit import AuditEvent

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def canonical_serialize(data: Dict[str, Any]) -> str:
    """Produces canonical JSON serialization (sorted keys, compact whitespace) for deterministic hashing."""
    return json.dumps(data, sort_keys=True, separators=(',', ':'), default=str)

def compute_event_hash(previous_hash: str, canonical_payload: str) -> str:
    """Computes SHA-256(previous_hash + canonical_payload)."""
    hasher = hashlib.sha256()
    hasher.update(previous_hash.encode("utf-8"))
    hasher.update(canonical_payload.encode("utf-8"))
    return hasher.hexdigest()

def record_audit_event(
    db: Session,
    actor_username: str,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Dict[str, Any],
    reason: Optional[str] = None
) -> AuditEvent:
    """Appends a new hash-linked tamper-evident audit record to the chain."""
    latest_event = db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
    previous_hash = latest_event.event_hash if latest_event else GENESIS_HASH

    event_uuid = str(uuid.uuid4())
    event_timestamp = datetime.now(timezone.utc)
    
    canonical_payload_dict = {
        "event_uuid": event_uuid,
        "actor_username": actor_username,
        "actor_role": actor_role,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "timestamp": event_timestamp.isoformat(),
        "details": details,
        "reason": reason or ""
    }
    canonical_payload_str = canonical_serialize(canonical_payload_dict)
    event_hash = compute_event_hash(previous_hash, canonical_payload_str)

    audit_entry = AuditEvent(
        event_uuid=event_uuid,
        actor_username=actor_username,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        timestamp=event_timestamp,
        details=canonical_payload_str,
        reason=reason,
        previous_event_hash=previous_hash,
        event_hash=event_hash
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

def verify_audit_chain(db: Session) -> Tuple[bool, int, Optional[int], str, str, str]:
    """
    Verifies the cryptographic integrity of the entire audit trail chain.
    Returns: (is_valid, total_events, broken_at_id, details, genesis_hash, latest_hash)
    """
    events = db.query(AuditEvent).order_by(AuditEvent.id.asc()).all()
    total = len(events)
    if total == 0:
        return True, 0, None, "Audit chain is empty. Genesis root is valid.", GENESIS_HASH, GENESIS_HASH

    expected_previous_hash = GENESIS_HASH
    for event in events:
        # 1. Verify previous hash link
        if event.previous_event_hash != expected_previous_hash:
            return (
                False,
                total,
                event.id,
                f"Hash link break at Event ID {event.id}: recorded previous_event_hash '{event.previous_event_hash}' does not match expected '{expected_previous_hash}'.",
                GENESIS_HASH,
                event.event_hash
            )
        
        # 2. Re-compute payload hash
        recalculated_hash = compute_event_hash(event.previous_event_hash, event.details)
        if recalculated_hash != event.event_hash:
            return (
                False,
                total,
                event.id,
                f"Tamper detected at Event ID {event.id}: payload recalculation yielded '{recalculated_hash}', but stored hash is '{event.event_hash}'.",
                GENESIS_HASH,
                event.event_hash
            )

        expected_previous_hash = event.event_hash

    latest_hash = events[-1].event_hash
    return (
        True,
        total,
        None,
        f"Audit chain verified successfully across {total} sequential events with zero breaks.",
        GENESIS_HASH,
        latest_hash
    )
