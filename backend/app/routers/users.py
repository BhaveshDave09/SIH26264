from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserResponse, UserCreate
from backend.app.services.auth import get_current_user, require_roles, hash_password
from backend.app.services.audit import record_audit_event

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=List[UserResponse])
def list_users(
    bureau: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists users for administration and task assignment."""
    query = db.query(User).filter(User.is_active == True)
    if bureau and bureau != "ALL":
        query = query.filter(User.bureau.in_([bureau, "ALL"]))
    if role and role != "ALL":
        query = query.filter(User.role == role)
    return query.order_by(User.full_name.asc()).all()

@router.get("/officers", response_model=List[UserResponse])
def list_officers_for_assignment(
    bureau: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists officers eligible for case or task assignment."""
    query = db.query(User).filter(
        User.is_active == True,
        User.role.in_(["BUREAU_OFFICER", "BUREAU_HEAD", "REGIONAL_OFFICER", "SUPER_ADMIN"])
    )
    if bureau and bureau != "ALL":
        query = query.filter(User.bureau.in_([bureau, "ALL"]))
    return query.order_by(User.full_name.asc()).all()

@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Super Administrator creates a new authorized official account."""
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    salt, hashed = hash_password(payload.password)
    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hashed,
        salt=salt,
        role=payload.role,
        bureau=payload.bureau,
        region=payload.region,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="USER_CREATED",
        entity_type="User",
        entity_id=str(user.id),
        details={"username": user.username, "role": user.role, "bureau": user.bureau},
        reason="Administrative user creation"
    )

    return user
