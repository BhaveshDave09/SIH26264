from datetime import date, datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.case import Case, CaseHistory
from backend.app.models.coordination import CoordinationTask
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.notification import Notification
from backend.app.services.audit import record_audit_event

def evaluate_sla_and_escalations(db: Session, auto_escalate: bool = False) -> Dict[str, Any]:
    """
    Evaluates all cases and coordination tasks against SLA thresholds.
    Flags overdue, approaching deadline, and escalated items.
    """
    today = date.today()
    warning_days = settings.SLA_WARNING_DAYS
    escalation_days = settings.SLA_ESCALATION_DAYS

    # Exclude disposed and closed cases from SLA tracking
    active_cases = db.query(Case).filter(~Case.status.in_(["Disposed", "Closed"])).all()
    
    overdue_cases = []
    approaching_cases = []
    escalated_cases = []

    for c in active_cases:
        days_elapsed = (today - c.received_date).days
        days_remaining = (c.expected_disposal_date - today).days
        is_overdue = days_remaining < 0
        is_approaching = (0 <= days_remaining <= warning_days)
        
        # Check auto-escalation: if overdue by more than escalation_days or explicit flag
        if is_overdue and abs(days_remaining) >= escalation_days and not c.is_escalated and auto_escalate:
            c.is_escalated = True
            c.escalation_reason = f"Automated SLA Escalation: Overdue by {abs(days_remaining)} days beyond expected disposal date {c.expected_disposal_date}."
            
            # Record case history
            hist = CaseHistory(
                case_id=c.id,
                actor_username="SYSTEM_SLA_ENGINE",
                action_type="ESCALATED",
                previous_status=c.status,
                new_status="Escalated",
                remarks=c.escalation_reason,
                timestamp=datetime.now(timezone.utc)
            )
            c.status = "Escalated"
            db.add(hist)

            # Record audit event
            record_audit_event(
                db=db,
                actor_username="SYSTEM_SLA_ENGINE",
                actor_role="SYSTEM",
                action="SLA_AUTO_ESCALATED",
                entity_type="Case",
                entity_id=c.id,
                details={"overdue_days": abs(days_remaining), "reason": c.escalation_reason},
                reason=c.escalation_reason
            )

            # Add notification
            notif = Notification(
                bureau=c.assigned_bureau,
                title=f"Case Escalated: {c.id}",
                message=f"Case {c.id} for {c.institution.name} has been escalated due to SLA breach ({abs(days_remaining)} days overdue).",
                notification_type="ESCALATION",
                link=f"/cases/{c.id}",
                created_at=datetime.now(timezone.utc)
            )
            db.add(notif)
            db.commit()

        inst = c.institution
        officer = c.assigned_officer
        case_item = {
            "id": c.id,
            "title": c.title,
            "institution_name": inst.name if inst else "Unknown",
            "institution_permanent_id": inst.permanent_id if inst else "N/A",
            "assigned_bureau": c.assigned_bureau,
            "status": c.status,
            "priority": c.priority,
            "received_date": c.received_date,
            "expected_disposal_date": c.expected_disposal_date,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
            "is_overdue": is_overdue,
            "is_approaching": is_approaching,
            "is_escalated": c.is_escalated,
            "assigned_officer_name": officer.full_name if officer else "Unassigned"
        }

        if is_overdue:
            overdue_cases.append(case_item)
        elif is_approaching:
            approaching_cases.append(case_item)
        if c.is_escalated:
            escalated_cases.append(case_item)

    # Evaluate coordination tasks
    active_tasks = db.query(CoordinationTask).filter(~CoordinationTask.status.in_(["Resolved", "Cancelled"])).all()
    overdue_tasks = []

    for t in active_tasks:
        task_days_remaining = (t.due_date - today).days
        is_task_overdue = task_days_remaining < 0
        owner = t.assigned_owner
        inst = t.institution
        task_item = {
            "id": t.id,
            "title": t.title,
            "institution_name": inst.name if inst else "Unknown",
            "originating_bureau": t.originating_bureau,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date,
            "days_remaining": task_days_remaining,
            "is_overdue": is_task_overdue,
            "assigned_owner_name": owner.full_name if owner else "Unassigned"
        }
        if is_task_overdue:
            overdue_tasks.append(task_item)

    return {
        "warning_threshold_days": warning_days,
        "escalation_threshold_days": escalation_days,
        "total_overdue_cases": len(overdue_cases),
        "total_approaching_cases": len(approaching_cases),
        "total_overdue_tasks": len(overdue_tasks),
        "total_escalated_cases": len(escalated_cases),
        "overdue_cases": overdue_cases,
        "approaching_cases": approaching_cases,
        "overdue_tasks": overdue_tasks
    }
