from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.user import User
from models.study_session import StudySession
from models.streak import Streak
from utils.auth_utils import get_current_user
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date, timedelta

router = APIRouter(prefix="/study", tags=["Study Mode"])


# ── Schemas ───────────────────────────────────────────────

class SessionStart(BaseModel):
    planned_minutes: int = Field(default=30, description="Must be 30, 60, or 90")
    subject: Optional[str] = None
    session_type: str = "focus"

    @validator("planned_minutes")
    def valid_duration(cls, v):
        if v not in [30, 60, 90]:
            raise ValueError("Duration must be 30, 60, or 90 minutes")
        return v

    @validator("session_type")
    def valid_type(cls, v):
        if v not in ["focus", "pomodoro"]:
            raise ValueError("session_type must be 'focus' or 'pomodoro'")
        return v


class SessionEnd(BaseModel):
    session_id: str
    duration_minutes: int = Field(..., ge=0)
    completed: bool = True
    focus_rating: Optional[float] = Field(None, ge=1, le=10)
    energy_rating: Optional[float] = Field(None, ge=1, le=10)
    post_notes: Optional[str] = None


class CheckinUpdate(BaseModel):
    focus_rating: float = Field(..., ge=1, le=10)
    energy_rating: float = Field(..., ge=1, le=10)
    post_notes: Optional[str] = None


class SessionOut(BaseModel):
    id: str
    session_type: str
    planned_minutes: int
    duration_minutes: int
    subject: Optional[str]
    completed: bool
    focus_rating: Optional[float]
    energy_rating: Optional[float]
    post_notes: Optional[str]
    created_at: datetime
    leo_prompt: Optional[str] = None

    class Config:
        from_attributes = True


class StudyStatsOut(BaseModel):
    total_sessions: int
    total_minutes: int
    total_hours: float
    avg_focus: Optional[float]
    avg_duration: Optional[float]
    favorite_subject: Optional[str]
    most_used_duration: Optional[int]
    completion_rate: float


# ── Helpers ───────────────────────────────────────────────

def update_study_streak(user_id: str, db: Session):
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if not streak:
        streak = Streak(user_id=user_id)
        db.add(streak)
        db.commit()

    today = date.today()
    if streak.last_study_date == today:
        return

    if streak.last_study_date == today - timedelta(days=1):
        streak.study_streak += 1
    else:
        streak.study_streak = 1

    streak.last_study_date = today
    if streak.study_streak > streak.study_streak_best:
        streak.study_streak_best = streak.study_streak
    db.commit()


def build_leo_prompt(persona: str, completed: bool, duration: int, planned: int, subject: Optional[str]) -> str:
    name = "Cleo" if persona == "cleo" else "Leo"
    subject_text = f" on {subject}" if subject else ""

    if completed:
        if duration >= planned:
            return (
                f"Full {planned} minutes done{subject_text} — that's a complete block! 💪 "
                f"How are you feeling right now? Want to log your mood so {name} can track "
                f"how study sessions affect your energy?"
            )
        else:
            return (
                f"Good work — {duration} minutes{subject_text} completed. "
                f"Even partial sessions add up. Want to tell {name} how you're feeling before you move on?"
            )
    else:
        return (
            f"No worries about stopping early. Sometimes that's exactly the right call. "
            f"Want to tell {name} what's going on? Your wellbeing always comes first. 💙"
        )


# ── Routes ────────────────────────────────────────────────

@router.post("/start", response_model=SessionOut, status_code=201)
def start_session(
    data: SessionStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new study session. Frontend sends 30, 60, or 90 from the buttons."""
    session = StudySession(
        user_id=current_user.id,
        planned_minutes=data.planned_minutes,
        session_type=data.session_type,
        subject=data.subject,
        duration_minutes=0,
        completed=False
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/end", response_model=SessionOut)
def end_session(
    data: SessionEnd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Called when timer finishes or user manually stops."""
    session = db.query(StudySession).filter(
        StudySession.id == data.session_id,
        StudySession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.duration_minutes = data.duration_minutes
    session.completed = data.completed
    session.focus_rating = data.focus_rating
    session.energy_rating = data.energy_rating
    session.post_notes = data.post_notes
    db.commit()
    db.refresh(session)

    if data.completed:
        update_study_streak(current_user.id, db)

    session.leo_prompt = build_leo_prompt(
        persona=current_user.persona,
        completed=data.completed,
        duration=data.duration_minutes,
        planned=session.planned_minutes,
        subject=session.subject
    )

    return session


@router.post("/{session_id}/checkin")
def post_session_checkin(
    session_id: str,
    data: CheckinUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quick 'How did that feel?' card after timer goes off."""
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.focus_rating = data.focus_rating
    session.energy_rating = data.energy_rating
    if data.post_notes:
        session.post_notes = data.post_notes
    db.commit()

    return {"message": "Check-in saved", "session_id": session.id}


@router.get("/history", response_model=List[SessionOut])
def get_history(
    limit: int = 10,
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StudySession).filter(StudySession.user_id == current_user.id)
    if subject:
        query = query.filter(StudySession.subject == subject)
    return query.order_by(desc(StudySession.created_at)).limit(limit).all()


@router.get("/stats", response_model=StudyStatsOut)
def get_study_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_sessions = db.query(StudySession).filter(
        StudySession.user_id == current_user.id
    ).all()

    if not all_sessions:
        return StudyStatsOut(
            total_sessions=0,
            total_minutes=0,
            total_hours=0.0,
            avg_focus=None,
            avg_duration=None,
            favorite_subject=None,
            most_used_duration=None,
            completion_rate=0.0
        )

    completed = [s for s in all_sessions if s.completed]
    total_minutes = sum(s.duration_minutes for s in completed)
    focus_scores = [s.focus_rating for s in completed if s.focus_rating]
    avg_focus = round(sum(focus_scores) / len(focus_scores), 2) if focus_scores else None

    subjects = [s.subject for s in all_sessions if s.subject]
    favorite_subject = max(set(subjects), key=subjects.count) if subjects else None

    durations = [s.planned_minutes for s in all_sessions]
    most_used_duration = max(set(durations), key=durations.count) if durations else None

    completion_rate = round(len(completed) / len(all_sessions) * 100, 1)
    avg_duration = round(total_minutes / len(completed), 1) if completed else None

    return StudyStatsOut(
        total_sessions=len(all_sessions),
        total_minutes=total_minutes,
        total_hours=round(total_minutes / 60, 1),
        avg_focus=avg_focus,
        avg_duration=avg_duration,
        favorite_subject=favorite_subject,
        most_used_duration=most_used_duration,
        completion_rate=completion_rate
    )


@router.get("/today")
def todays_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(StudySession).filter(
        StudySession.user_id == current_user.id,
        StudySession.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
    ).order_by(desc(StudySession.created_at)).all()

    total_today = sum(s.duration_minutes for s in sessions if s.completed)

    return {
        "sessions": sessions,
        "total_minutes_today": total_today,
        "sessions_completed": len([s for s in sessions if s.completed])
    }