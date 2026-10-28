from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.sla import SLASummaryResponse
from backend.app.services.auth import get_current_user, require_write_access
from backend.app.services.sla import evaluate_sla_and_escalations
from backend.app.services.audit import record_audit_event

router = APIRouter(prefix="/sla", tags=["SLA & Escalation Engine"])

@router.get("/summary", response_model=SLASummaryResponse)
def get_sla_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns real-time SLA metrics: overdue cases, approaching deadlines, and overdue tasks."""
    return evaluate_sla_and_escalations(db, auto_escalate=False)

@router.post("/evaluate", response_model=SLASummaryResponse)
def trigger_sla_evaluation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """
    Triggers automated SLA evaluation and executes rule-based auto-escalations.
    Records escalation events and sends notifications.
    """
    result = evaluate_sla_and_escalations(db, auto_escalate=True)

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="SLA_BATCH_EVALUATED",
        entity_type="System",
        entity_id="SLA_ENGINE",
        details={
            "overdue_cases": result["total_overdue_cases"],
            "approaching_cases": result["total_approaching_cases"],
            "escalated_cases": result["total_escalated_cases"],
            "overdue_tasks": result["total_overdue_tasks"]
        },
        reason="Manual or cron-based SLA evaluation cycle"
    )

    return result
