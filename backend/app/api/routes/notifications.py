"""
Notification routes: list, mark read, delete.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationMarkRead, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    notifications = (
        q.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return notifications


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"unread_count": count}


@router.patch("/mark-read")
def mark_notifications_read(
    payload: NotificationMarkRead,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    updated = (
        db.query(Notification)
        .filter(
            Notification.id.in_(payload.notification_ids),
            Notification.user_id == current_user.id,
        )
        .all()
    )
    for n in updated:
        n.is_read = True
    db.commit()
    return {"message": f"{len(updated)} notification(s) marked as read."}


@router.patch("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found.")
    db.delete(n)
    db.commit()
