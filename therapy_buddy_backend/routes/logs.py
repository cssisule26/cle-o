from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.user import User
from models.daily_log import DailyLog
from schemas.log_schema import LogCreate, LogOut
from utils.auth_utils import get_current_user
from datetime import date, timedelta
from typing import List

router = APIRouter(prefix="/logs", tags=["Daily Logs"])


@router.post("", response_model=LogOut, status_code=201)
def create_log(
    data: LogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Prevent duplicate log for today
    existing = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date == date.today()
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You've already logged today. Update your existing log instead."
        )

    log = DailyLog(
        user_id=current_user.id,
        mood=data.mood,
        stress=data.stress,
        sleep_hours=data.sleep_hours,
        exercise_minutes=data.exercise_minutes,
        notes=data.notes
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("", response_model=List[LogOut])
def get_logs(
    range: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    since = date.today() - timedelta(days=range)
    logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= since
    ).order_by(desc(DailyLog.date)).all()
    return logs


@router.get("/today", response_model=LogOut)
def get_today_log(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date == date.today()
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="No log found for today yet")
    return log


@router.delete("/{log_id}", status_code=204)
def delete_log(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(DailyLog).filter(
        DailyLog.id == log_id,
        DailyLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    db.delete(log)
    db.commit()