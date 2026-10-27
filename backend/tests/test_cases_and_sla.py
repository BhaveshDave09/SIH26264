import pytest
from datetime import date
from backend.app.database import SessionLocal
from backend.app.services.sla import evaluate_sla_and_escalations
from backend.app.services.analytics import get_dashboard_statistics
from backend.app.models.case import Case

def test_sla_evaluation():
    db = SessionLocal()
    try:
        sla = evaluate_sla_and_escalations(db, auto_escalate=False)
        assert "total_overdue_cases" in sla
        assert "total_approaching_cases" in sla
        assert sla["total_overdue_cases"] >= 1  # We seeded overdue cases
        assert len(sla["overdue_cases"]) > 0
    finally:
        db.close()

def test_dashboard_statistics_from_db():
    db = SessionLocal()
    try:
        stats = get_dashboard_statistics(db)
        assert stats["total_cases"] >= 25
        assert stats["pending_cases"] > 0
        assert stats["open_coordination_alerts"] > 0
        assert len(stats["bureau_workload"]) == 4
        assert len(stats["ageing_distribution"]) == 4
        assert stats["coordination_health_score"] >= 15
    finally:
        db.close()
