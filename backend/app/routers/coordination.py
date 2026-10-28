import json
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.coordination import CoordinationTask, CoordinationUpdate
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.schemas.coordination import (
    CoordinationTaskResponse, CoordinationTaskCreate, CoordinationTaskUpdate,
    CoordinationUpdateCreate, CoordinationUpdateResponse
)
from backend.app.services.auth import get_current_user, require_write_access
from backend.app.services.audit import record_audit_event

router = APIRouter(prefix="/coordination", tags=["Coordination Center"])

def format_task(task: CoordinationTask, db: Session) -> dict:
    """Enriches CoordinationTask with institution name, owner name, related cases, and overdue state."""
    today = date.today()
    inst = task.institution
    owner = task.assigned_owner
    creator = task.creator

    try:
        related_ids = json.loads(task.related_case_ids) if task.related_case_ids else []
    except Exception:
        related_ids = [task.related_case_ids]

    try:
        part_bureaus = json.loads(task.participating_bureaus) if task.participating_bureaus else []
    except Exception:
        part_bureaus = [task.participating_bureaus]

    is_overdue = (task.due_date < today) and (task.status not in ["Resolved", "Cancelled"])

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "institution_id": task.institution_id,
        "institution_name": inst.name if inst else "Unknown",
        "institution_permanent_id": inst.permanent_id if inst else "N/A",
        "primary_case_id": task.primary_case_id,
        "related_case_ids": related_ids,
        "originating_bureau": task.originating_bureau,
        "participating_bureaus": part_bureaus,
        "assigned_owner_id": task.assigned_owner_id,
        "assigned_owner_name": owner.full_name if owner else "Unassigned",
        "created_by_id": task.created_by_id,
        "creator_name": creator.full_name if creator else "System",
        "priority": task.priority,
        "status": task.status,
        "due_date": task.due_date,
        "is_overdue": is_overdue,
        "resolution_notes": task.resolution_notes,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "updates": task.updates
    }

@router.get("/tasks", response_model=List[CoordinationTaskResponse])
def list_coordination_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    bureau: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists coordination tasks with filtering."""
    query = db.query(CoordinationTask)

    if status and status != "ALL":
        query = query.filter(CoordinationTask.status == status)
    if priority and priority != "ALL":
        query = query.filter(CoordinationTask.priority == priority)
    if bureau and bureau != "ALL":
        query = query.filter(
            or_(
                CoordinationTask.originating_bureau == bureau,
                CoordinationTask.participating_bureaus.ilike(f'%"{bureau}"%')
            )
        )
    if institution_id:
        query = query.filter(CoordinationTask.institution_id == institution_id)

    today = date.today()
    if is_overdue is not None:
        if is_overdue:
            query = query.filter(CoordinationTask.due_date < today, ~CoordinationTask.status.in_(["Resolved", "Cancelled"]))
        else:
            query = query.filter(or_(CoordinationTask.due_date >= today, CoordinationTask.status.in_(["Resolved", "Cancelled"])))

    tasks = query.order_by(CoordinationTask.created_at.desc()).all()
    return [format_task(t, db) for t in tasks]

@router.get("/tasks/{id}", response_model=CoordinationTaskResponse)
def get_coordination_task(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieves single coordination task with full update history."""
    task = db.query(CoordinationTask).filter(CoordinationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return format_task(task, db)

@router.post("/tasks", response_model=CoordinationTaskResponse)
def create_coordination_task(
    payload: CoordinationTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """Creates a new inter-bureau coordination task."""
    inst = db.query(Institution).filter(Institution.id == payload.institution_id).first()
    if not inst:
        raise HTTPException(status_code=400, detail="Invalid institution reference")

    count_tasks = db.query(CoordinationTask).count() + 1
    task_id = f"COORD-{date.today().year}-{str(count_tasks).zfill(3)}"

    task = CoordinationTask(
        id=task_id,
        title=payload.title,
        description=payload.description,
        institution_id=payload.institution_id,
        primary_case_id=payload.primary_case_id,
        related_case_ids=json.dumps(payload.related_case_ids),
        originating_bureau=payload.originating_bureau,
        participating_bureaus=json.dumps(payload.participating_bureaus),
        assigned_owner_id=payload.assigned_owner_id,
        created_by_id=current_user.id,
        priority=payload.priority,
        status="Open",
        due_date=payload.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Initial update log
    init_update = CoordinationUpdate(
        task_id=task.id,
        user_id=current_user.id,
        username=current_user.username,
        update_type="COMMENT",
        remarks=f"Task initialized by {current_user.full_name} for cross-bureau coordination.",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(init_update)
    db.commit()

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="COORDINATION_TASK_CREATED",
        entity_type="CoordinationTask",
        entity_id=task.id,
        details={
            "task_id": task.id,
            "title": task.title,
            "originating_bureau": task.originating_bureau,
            "participating_bureaus": payload.participating_bureaus,
            "assigned_owner_id": payload.assigned_owner_id,
            "due_date": str(payload.due_date)
        },
        reason="Cross-Bureau coordination task initiated"
    )

    return format_task(task, db)

@router.put("/tasks/{id}", response_model=CoordinationTaskResponse)
def update_coordination_task(
    id: str,
    payload: CoordinationTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """Updates coordination task status, owner, or resolution notes."""
    task = db.query(CoordinationTask).filter(CoordinationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    changes = {}
    if payload.status is not None and payload.status != task.status:
        changes["status"] = {"old": task.status, "new": payload.status}
        task.status = payload.status
        # Log status change in task updates
        upd = CoordinationUpdate(
            task_id=task.id,
            user_id=current_user.id,
            username=current_user.username,
            update_type="STATUS_CHANGE",
            remarks=f"Status changed to '{payload.status}'. Notes: {payload.resolution_notes or ''}",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(upd)

    if payload.assigned_owner_id is not None and payload.assigned_owner_id != task.assigned_owner_id:
        new_owner = db.query(User).filter(User.id == payload.assigned_owner_id).first()
        changes["owner"] = {"old": task.assigned_owner_id, "new": payload.assigned_owner_id}
        task.assigned_owner_id = payload.assigned_owner_id
        upd = CoordinationUpdate(
            task_id=task.id,
            user_id=current_user.id,
            username=current_user.username,
            update_type="REASSIGNMENT",
            remarks=f"Reassigned to {new_owner.full_name if new_owner else 'Officer'} by {current_user.username}",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(upd)

    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.resolution_notes is not None:
        task.resolution_notes = payload.resolution_notes
    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.priority is not None:
        task.priority = payload.priority

    task.updated_at = datetime.now(timezone.utc)
    db.commit()

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="COORDINATION_TASK_UPDATED",
        entity_type="CoordinationTask",
        entity_id=task.id,
        details=changes or {"action": "details_updated"},
        reason="Coordination task updated"
    )

    return format_task(task, db)

@router.post("/tasks/{id}/updates", response_model=CoordinationUpdateResponse)
def add_coordination_update(
    id: str,
    payload: CoordinationUpdateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """Appends remarks, inter-bureau handoffs, or progress notes to a task."""
    task = db.query(CoordinationTask).filter(CoordinationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.new_status and payload.new_status != task.status:
        task.status = payload.new_status
    if payload.new_owner_id and payload.new_owner_id != task.assigned_owner_id:
        task.assigned_owner_id = payload.new_owner_id

    update = CoordinationUpdate(
        task_id=task.id,
        user_id=current_user.id,
        username=current_user.username,
        update_type=payload.update_type,
        remarks=payload.remarks,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(update)
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(update)

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="COORDINATION_UPDATE_ADDED",
        entity_type="CoordinationTask",
        entity_id=task.id,
        details={"type": payload.update_type, "remarks": payload.remarks},
        reason="Progress remark added to coordination task"
    )

    return update
