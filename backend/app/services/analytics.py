from datetime import date, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session

from backend.app.models.case import Case, CaseHistory
from backend.app.models.relationship import CaseRelationship
from backend.app.models.coordination import CoordinationTask
from backend.app.services.sla import evaluate_sla_and_escalations

def get_dashboard_statistics(db: Session, bureau_filter: str = None) -> Dict[str, Any]:
    """
    Computes real-time executive dashboard metrics from actual database tables.
    """
    today = date.today()
    case_query = db.query(Case)
    if bureau_filter and bureau_filter != "ALL":
        case_query = case_query.filter(Case.assigned_bureau == bureau_filter)

    cases = case_query.all()
    total_cases = len(cases)

    pending_cases = sum(1 for c in cases if c.status in ["Received", "Pending Review"])
    under_process = sum(1 for c in cases if c.status in ["Under Process", "Escalated"])
    disposed_cases = sum(1 for c in cases if c.status in ["Disposed", "Closed"])
    transferred_cases = sum(1 for c in cases if c.status == "Transferred")

    # SLA calculations
    sla_data = evaluate_sla_and_escalations(db, auto_escalate=False)
    overdue_cases = sla_data["total_overdue_cases"]
    approaching_deadline = sla_data["total_approaching_cases"]

    # Open cross-Bureau coordination alerts
    rel_query = db.query(CaseRelationship).filter(CaseRelationship.status.in_(["DETECTED", "COORDINATION_FLAGGED"]))
    open_coordination_alerts = rel_query.count()

    # Active coordination tasks
    active_tasks = db.query(CoordinationTask).filter(~CoordinationTask.status.in_(["Resolved", "Cancelled"])).count()

    # Coordination Health Score Calculation:
    # Starts at 100, penalized by overdue tasks (-5 per task), unresolved alerts (-3 per alert), and escalated cases (-4)
    overdue_task_count = sla_data["total_overdue_tasks"]
    escalated_count = sla_data["total_escalated_cases"]
    penalty = (overdue_task_count * 6) + (open_coordination_alerts * 3) + (escalated_count * 4)
    coordination_health = max(15, min(100, 100 - penalty))
    
    if coordination_health >= 85:
        health_explanation = "Optimal: Inter-bureau tasks and SLA deadlines are actively managed with minimal bottlenecks."
    elif coordination_health >= 65:
        health_explanation = "Moderate: Multiple cross-bureau overlap alerts require review, with some tasks nearing target deadlines."
    else:
        health_explanation = "Action Required: Significant backlog of overdue inter-bureau coordination tasks and unconfirmed cross-bureau alerts."

    # Bureau workload
    bureaus = ["RB", "PGRC", "APPROVAL_BUREAU", "FINANCE_BUREAU"]
    bureau_workload = []
    for b in bureaus:
        b_cases = [c for c in cases if c.assigned_bureau == b]
        b_total = len(b_cases)
        b_pending = sum(1 for c in b_cases if c.status in ["Received", "Pending Review", "Under Process", "Escalated"])
        b_disposed = sum(1 for c in b_cases if c.status in ["Disposed", "Closed"])
        b_overdue = sum(1 for c in b_cases if (c.expected_disposal_date < today) and c.status not in ["Disposed", "Closed"])
        bureau_workload.append({
            "bureau": b,
            "total_cases": b_total,
            "pending_cases": b_pending,
            "disposed_cases": b_disposed,
            "overdue_cases": b_overdue
        })

    # Monthly trends (last 6 months)
    monthly_trends = []
    for i in range(5, -1, -1):
        target_month_date = today - timedelta(days=i * 30)
        month_label = target_month_date.strftime("%b %Y")
        m_received = sum(1 for c in cases if c.received_date.year == target_month_date.year and c.received_date.month == target_month_date.month)
        m_disposed = sum(1 for c in cases if c.status in ["Disposed", "Closed"] and c.updated_at.year == target_month_date.year and c.updated_at.month == target_month_date.month)
        # Ensure realistic demonstration numbers if new DB
        monthly_trends.append({
            "month": month_label,
            "received_count": m_received,
            "disposed_count": m_disposed
        })

    # Ageing distribution
    bucket_0_15 = 0
    bucket_16_30 = 0
    bucket_31_60 = 0
    bucket_60_plus = 0

    for c in cases:
        if c.status not in ["Disposed", "Closed"]:
            age = (today - c.received_date).days
            if age <= 15:
                bucket_0_15 += 1
            elif age <= 30:
                bucket_16_30 += 1
            elif age <= 60:
                bucket_31_60 += 1
            else:
                bucket_60_plus += 1

    ageing_distribution = [
        {"bucket": "0 - 15 Days", "count": bucket_0_15},
        {"bucket": "16 - 30 Days", "count": bucket_16_30},
        {"bucket": "31 - 60 Days", "count": bucket_31_60},
        {"bucket": "60+ Days", "count": bucket_60_plus}
    ]

    # Category distribution
    cat_counts: Dict[str, int] = {}
    for c in cases:
        cat_counts[c.category] = cat_counts.get(c.category, 0) + 1
    category_distribution = [{"category": k, "count": v} for k, v in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)]

    # Recent actions
    recent_histories = db.query(CaseHistory).order_by(CaseHistory.timestamp.desc()).limit(8).all()
    recent_actions = [
        {
            "id": h.id,
            "case_id": h.case_id,
            "actor": h.actor_username,
            "action_type": h.action_type,
            "remarks": h.remarks,
            "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M UTC")
        }
        for h in recent_histories
    ]

    # High priority items
    high_priority_cases = [c for c in cases if c.priority in ["Critical", "High"] and c.status not in ["Disposed", "Closed"]][:6]
    high_priority_items = []
    for c in high_priority_cases:
        inst = c.institution
        is_od = (c.expected_disposal_date < today)
        has_overlap = db.query(CaseRelationship).filter(
            ((CaseRelationship.case_id_1 == c.id) | (CaseRelationship.case_id_2 == c.id)),
            CaseRelationship.status.in_(["DETECTED", "COORDINATION_FLAGGED"])
        ).first() is not None

        high_priority_items.append({
            "id": c.id,
            "title": c.title,
            "institution_name": inst.name if inst else "Unknown",
            "priority": c.priority,
            "status": c.status,
            "assigned_bureau": c.assigned_bureau,
            "is_overdue": is_od,
            "has_overlap_alert": has_overlap
        })

    return {
        "total_cases": total_cases,
        "pending_cases": pending_cases,
        "under_process_cases": under_process,
        "disposed_cases": disposed_cases,
        "transferred_cases": transferred_cases,
        "overdue_cases": overdue_cases,
        "approaching_deadline_cases": approaching_deadline,
        "open_coordination_alerts": open_coordination_alerts,
        "active_coordination_tasks": active_tasks,
        "coordination_health_score": coordination_health,
        "coordination_health_explanation": health_explanation,
        "bureau_workload": bureau_workload,
        "monthly_trends": monthly_trends,
        "ageing_distribution": ageing_distribution,
        "category_distribution": category_distribution,
        "recent_actions": recent_actions,
        "high_priority_items": high_priority_items
    }
