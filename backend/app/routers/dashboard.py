from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.dashboard import DashboardStatsResponse
from backend.app.services.auth import get_current_user
from backend.app.services.analytics import get_dashboard_statistics

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    bureau: Optional[str] = Query(None, description="Filter by Bureau (e.g. RB, PGRC, ALL)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns complete live executive dashboard metrics calculated from active database tables.
    Includes counts, bureau workload, monthly trends, ageing buckets, recent actions, and Coordination Health.
    """
    selected_bureau = bureau
    # If officer/head is scoped to a bureau and didn't specify, default to user's bureau if not ALL
    if not selected_bureau and current_user.bureau != "ALL":
        selected_bureau = current_user.bureau

    return get_dashboard_statistics(db, bureau_filter=selected_bureau)
