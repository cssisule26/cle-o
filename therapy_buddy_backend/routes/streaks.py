from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.streak import Streak
from models.daily_log import DailyLog
from utils.auth_utils import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/streaks", tags=["Streaks"])


def get_or_create_streak(user_id: str, db: Session) -> Streak:
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if not streak:
        streak = Streak(user_id=user_id)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    return streak


def recalculate_streaks(user_id: str, db: Session):
    """Recalculates all streaks based on actual log history."""
    streak = get_or_create_streak(user_id, db)
    user = db.query(User).filter(User.id == user_id).first()

    today = date.today()
    yesterday = today - timedelta(days=1)

    # ── Log streak ──────────────────────────────────────
    logged_today = db.query(DailyLog).filter(
        DailyLog.user_id == user_id,
        DailyLog.date == today
    ).first()

    if logged_today:
        if streak.last_log_date == yesterday or streak.last_log_date == today:
            if streak.last_log_date != today:
                streak.log_streak += 1
                streak.last_log_date = today
        else:
            streak.log_streak = 1
            streak.last_log_date = today

        if streak.log_streak > streak.log_streak_best:
            streak.log_streak_best = streak.log_streak

    elif streak.last_log_date and streak.last_log_date < yesterday:
        streak.log_streak = 0  # broken

    # ── Sleep streak ────────────────────────────────────
    if logged_today and logged_today.sleep_hours >= user.sleep_goal:
        if streak.last_sleep_date == yesterday or streak.last_sleep_date == today:
            if streak.last_sleep_date != today:
                streak.sleep_streak += 1
                streak.last_sleep_date = today
        else:
            streak.sleep_streak = 1
            streak.last_sleep_date = today

        if streak.sleep_streak > streak.sleep_streak_best:
            streak.sleep_streak_best = streak.sleep_streak

    elif streak.last_sleep_date and streak.last_sleep_date < yesterday:
        streak.sleep_streak = 0

    db.commit()
    db.refresh(streak)
    return streak


@router.get("")
def get_streaks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    streak = recalculate_streaks(current_user.id, db)

    return {
        "streaks": {
            "log": {
                "current": streak.log_streak,
                "best": streak.log_streak_best,
                "label": "Daily Check-in"
            },
            "sleep": {
                "current": streak.sleep_streak,
                "best": streak.sleep_streak_best,
                "label": "Sleep Goal"
            },
            "study": {
                "current": streak.study_streak,
                "best": streak.study_streak_best,
                "label": "Study Session"
            }
        },
        "message": _streak_message(streak)
    }


def _streak_message(streak: Streak) -> str:
    best = max(streak.log_streak, streak.sleep_streak, streak.study_streak)
    if best >= 7:
        return f"🔥 {best} days strong — you're building real momentum!"
    elif best >= 3:
        return f"⚡ {best} days in a row — keep it going!"
    elif best >= 1:
        return "✅ You showed up today — that's how streaks start."
    else:
        return "Start your first streak by logging today 💙"