from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc
from database import get_db
from models.user import User
from models.calendar_event import CalendarEvent
from utils.auth_utils import get_current_user
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, date

router = APIRouter(prefix="/calendar", tags=["Calendar"])


class EventCreate(BaseModel):
    title: str
    event_type: Literal["exam", "assignment", "class", "other"]
    subject: Optional[str] = None
    due_date: date
    due_time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class EventOut(BaseModel):
    id: str
    title: str
    event_type: str
    subject: Optional[str]
    due_date: date
    due_time: Optional[str]
    location: Optional[str]
    notes: Optional[str]
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = CalendarEvent(
        user_id=current_user.id,
        title=data.title,
        event_type=data.event_type,
        subject=data.subject,
        due_date=data.due_date,
        due_time=data.due_time,
        location=data.location,
        notes=data.notes
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=List[EventOut])
def get_events(
    event_type: Optional[str] = None,
    upcoming_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)

    if upcoming_only:
        query = query.filter(CalendarEvent.due_date >= date.today())
    if event_type:
        query = query.filter(CalendarEvent.event_type == event_type)

    return query.order_by(asc(CalendarEvent.due_date)).all()


@router.get("/upcoming")
def get_upcoming(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import timedelta
    end_date = date.today() + timedelta(days=days)

    events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == current_user.id,
        CalendarEvent.due_date >= date.today(),
        CalendarEvent.due_date <= end_date,
        CalendarEvent.completed == False
    ).order_by(asc(CalendarEvent.due_date)).all()

    # Group by type for frontend
    grouped = {"exam": [], "assignment": [], "class": [], "other": []}
    for e in events:
        grouped[e.event_type].append({
            "id": e.id,
            "title": e.title,
            "subject": e.subject,
            "due_date": str(e.due_date),
            "due_time": e.due_time
        })

    return {"days_ahead": days, "events": grouped, "total": len(events)}


@router.patch("/{event_id}/complete", response_model=EventOut)
def mark_complete(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.completed = True
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()