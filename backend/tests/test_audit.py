import pytest
from backend.app.database import SessionLocal
from backend.app.services.audit import verify_audit_chain, record_audit_event, compute_event_hash
from backend.app.models.audit import AuditEvent

def test_audit_chain_validity():
    db = SessionLocal()
    try:
        is_valid, count, broken_id, details, gen_hash, latest_hash = verify_audit_chain(db)
        assert is_valid is True
        assert count > 0
        assert broken_id is None
        assert len(latest_hash) == 64
    finally:
        db.close()

def test_audit_chain_tamper_detection():
    db = SessionLocal()
    try:
        # Append a test event
        ev = record_audit_event(
            db=db,
            actor_username="unit_tester",
            actor_role="TESTER",
            action="TEST_ACTION",
            entity_type="TestEntity",
            entity_id="9999",
            details={"field": "original_value"},
            reason="Testing tamper detection"
        )
        
        # Verify it passes
        is_valid, _, _, _, _, _ = verify_audit_chain(db)
        assert is_valid is True

        # Artificially alter the payload in DB
        original_details = ev.details
        ev.details = '{"field":"tampered_value"}'
        db.commit()

        # Chain verification MUST fail and identify ev.id
        is_valid, count, broken_id, details, _, _ = verify_audit_chain(db)
        assert is_valid is False
        assert broken_id == ev.id
        assert "Tamper detected" in details

        # Restore original
        ev.details = original_details
        db.commit()

        # Chain verification passes again
        is_valid, _, _, _, _, _ = verify_audit_chain(db)
        assert is_valid is True

    finally:
        # Clean up test event
        db.query(AuditEvent).filter(AuditEvent.actor_username == "unit_tester").delete()
        db.commit()
        db.close()
