import io
import csv
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.case import Case
from backend.app.models.institution import Institution
from backend.app.models.relationship import CaseRelationship
from backend.app.models.coordination import CoordinationTask
from backend.app.models.user import User
from backend.app.schemas.report import ReportResponse
from backend.app.services.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/stats", response_model=ReportResponse)
def get_report_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    bureau: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates comprehensive executive report metrics across Bureaus and Regions."""
    today = date.today()
    query = db.query(Case).join(Institution, Case.institution_id == Institution.id)

    if start_date:
        query = query.filter(Case.received_date >= start_date)
    if end_date:
        query = query.filter(Case.received_date <= end_date)
    if bureau and bureau != "ALL":
        query = query.filter(Case.assigned_bureau == bureau)
    if region and region != "ALL":
        query = query.filter(Institution.region == region)

    cases = query.all()
    total_cases = len(cases)

    # Bureau summary
    bureaus = ["RB", "PGRC", "APPROVAL_BUREAU", "FINANCE_BUREAU"]
    bureau_summary = []
    for b in bureaus:
        b_cases = [c for c in cases if c.assigned_bureau == b]
        b_total = len(b_cases)
        b_pending = sum(1 for c in b_cases if c.status not in ["Disposed", "Closed"])
        b_disposed = sum(1 for c in b_cases if c.status in ["Disposed", "Closed"])
        b_overdue = sum(1 for c in b_cases if c.expected_disposal_date < today and c.status not in ["Disposed", "Closed"])
        disposal_rate = round((b_disposed / b_total * 100), 1) if b_total > 0 else 0.0
        
        ages = [(today - c.received_date).days for c in b_cases]
        avg_age = round(sum(ages) / len(ages), 1) if ages else 0.0

        bureau_summary.append({
            "bureau": b,
            "total_received": b_total,
            "pending": b_pending,
            "disposed": b_disposed,
            "overdue": b_overdue,
            "disposal_rate": disposal_rate,
            "avg_age_days": avg_age
        })

    # Region summary
    regions = ["North", "South", "East", "West", "Central", "North-West"]
    region_summary = []
    for r in regions:
        r_insts = db.query(Institution).filter(Institution.region == r).count()
        r_cases = [c for c in cases if c.institution.region == r]
        r_total = len(r_cases)
        r_active = sum(1 for c in r_cases if c.status not in ["Disposed", "Closed"])
        r_overdue = sum(1 for c in r_cases if c.expected_disposal_date < today and c.status not in ["Disposed", "Closed"])

        region_summary.append({
            "region": r,
            "total_institutions": r_insts,
            "total_cases": r_total,
            "active_cases": r_active,
            "overdue_cases": r_overdue
        })

    # Global resolution stats
    disposed_cases = [c for c in cases if c.status in ["Disposed", "Closed"]]
    res_days = [(c.updated_at.date() - c.received_date).days for c in disposed_cases if c.updated_at]
    avg_res_days = round(sum(res_days) / len(res_days), 1) if res_days else 14.5

    confirmed_overlaps = db.query(CaseRelationship).filter(CaseRelationship.status == "CONFIRMED_RELATED").count()
    coord_tasks = db.query(CoordinationTask).all()
    resolved_coord = sum(1 for t in coord_tasks if t.status == "Resolved")
    coord_rate = round((resolved_coord / len(coord_tasks) * 100), 1) if coord_tasks else 100.0

    return {
        "bureau_summary": bureau_summary,
        "region_summary": region_summary,
        "total_cases_analyzed": total_cases,
        "avg_resolution_days": avg_res_days,
        "total_confirmed_overlaps": confirmed_overlaps,
        "total_coordination_tasks": len(coord_tasks),
        "coordination_resolution_rate": coord_rate
    }

@router.get("/export/csv")
def export_cases_csv(
    bureau: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Streams live CSV export directly from database query results."""
    query = db.query(Case).join(Institution, Case.institution_id == Institution.id)

    if bureau and bureau != "ALL":
        query = query.filter(Case.assigned_bureau == bureau)
    if status and status != "ALL":
        query = query.filter(Case.status == status)
    if priority and priority != "ALL":
        query = query.filter(Case.priority == priority)
    if region and region != "ALL":
        query = query.filter(Institution.region == region)

    cases = query.order_by(Case.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Case ID",
        "AICTE Permanent ID",
        "Institution Name",
        "Region",
        "State",
        "Complainant Type",
        "Complaint Title",
        "Category",
        "Priority",
        "Status",
        "Assigned Bureau",
        "Assigned Officer",
        "Received Date",
        "Expected Disposal Date",
        "Is Escalated",
        "Last Action",
        "Next Action Required"
    ])

    for c in cases:
        inst = c.institution
        officer = c.assigned_officer
        writer.writerow([
            c.id,
            inst.permanent_id if inst else "",
            inst.name if inst else "",
            inst.region if inst else "",
            inst.state if inst else "",
            c.complainant_type,
            c.title,
            c.category,
            c.priority,
            c.status,
            c.assigned_bureau,
            officer.full_name if officer else "Unassigned",
            str(c.received_date),
            str(c.expected_disposal_date),
            "YES" if c.is_escalated else "NO",
            c.last_action or "",
            c.next_action_required or ""
        ])

    output.seek(0)
    filename = f"NivaranX_Cases_Export_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
