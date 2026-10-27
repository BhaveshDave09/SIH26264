from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.notification import Notification
from backend.app.models.user import User
from backend.app.schemas.notification import NotificationResponse
from backend.app.services.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns alerts relevant to the current user and their Bureau."""
    query = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.bureau == current_user.bureau,
            Notification.bureau == "ALL",
            Notification.bureau.is_(None)
        )
    )
    return query.order_by(Notification.created_at.desc()).limit(30).all()

@router.post("/{id}/read", response_model=NotificationResponse)
def mark_notification_read(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Marks single notification as read."""
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Marks all user/bureau notifications as read."""
    notifications = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.bureau == current_user.bureau,
            Notification.bureau == "ALL"
        ),
        Notification.is_read == False
    ).all()
    for n in notifications:
        n.is_read = True
    db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read"}
