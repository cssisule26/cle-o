from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.user import User
from models.daily_log import DailyLog
from models.streak import Streak
from models.study_session import StudySession
from utils.auth_utils import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/insights", tags=["Insights & Trends"])


def get_logs_for_range(user_id: str, days: int, db: Session):
    since = date.today() - timedelta(days=days)
    return db.query(DailyLog).filter(
        DailyLog.user_id == user_id,
        DailyLog.date >= since
    ).order_by(DailyLog.date).all()


def avg(values):
    return round(sum(values) / len(values), 2) if values else None


@router.get("/weekly")
def weekly_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = get_logs_for_range(current_user.id, 7, db)

    if not logs:
        return {"message": "No data yet. Start logging daily to see trends."}

    # Daily breakdown for chart rendering
    daily = []
    for log in logs:
        daily.append({
            "date": str(log.date),
            "mood": log.mood,
            "stress": log.stress,
            "sleep": log.sleep_hours,
            "exercise": log.exercise_minutes,
            "water": log.water_glasses
        })

    moods = [l.mood for l in logs]
    stresses = [l.stress for l in logs]
    sleeps = [l.sleep_hours for l in logs]
    exercises = [l.exercise_minutes for l in logs]
    waters = [l.water_glasses for l in logs]

    # Trend direction
    def trend(values):
        if len(values) < 2:
            return "stable"
        mid = len(values) // 2
        first = sum(values[:mid]) / mid
        second = sum(values[mid:]) / (len(values) - mid)
        if second > first + 0.5:
            return "improving"
        elif second < first - 0.5:
            return "declining"
        return "stable"

    return {
        "period": "7 days",
        "daily_breakdown": daily,
        "averages": {
            "mood": avg(moods),
            "stress": avg(stresses),
            "sleep": avg(sleeps),
            "exercise": avg(exercises),
            "water": avg(waters)
        },
        "trends": {
            "mood": trend(moods),
            "stress": trend(stresses),
            "sleep": trend(sleeps)
        },
        "days_logged": len(logs)
    }


@router.get("/monthly")
def monthly_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = get_logs_for_range(current_user.id, 30, db)

    if not logs:
        return {"message": "No data yet for the past month."}

    # Group by week for monthly chart
    weeks = {}
    for log in logs:
        week_num = log.date.isocalendar()[1]
        key = f"week_{week_num}"
        if key not in weeks:
            weeks[key] = {"mood": [], "stress": [], "sleep": [], "water": []}
        weeks[key]["mood"].append(log.mood)
        weeks[key]["stress"].append(log.stress)
        weeks[key]["sleep"].append(log.sleep_hours)
        weeks[key]["water"].append(log.water_glasses)

    weekly_breakdown = {}
    for week, data in weeks.items():
        weekly_breakdown[week] = {
            "mood_avg": avg(data["mood"]),
            "stress_avg": avg(data["stress"]),
            "sleep_avg": avg(data["sleep"]),
            "water_avg": avg(data["water"])
        }

    all_moods = [l.mood for l in logs]
    all_sleep = [l.sleep_hours for l in logs]
    all_stress = [l.stress for l in logs]

    # Best and worst days
    best_day = max(logs, key=lambda l: l.mood)
    worst_day = min(logs, key=lambda l: l.mood)

    return {
        "period": "30 days",
        "weekly_breakdown": weekly_breakdown,
        "averages": {
            "mood": avg(all_moods),
            "stress": avg(all_stress),
            "sleep": avg(all_sleep)
        },
        "best_day": {"date": str(best_day.date), "mood": best_day.mood},
        "worst_day": {"date": str(worst_day.date), "mood": worst_day.mood},
        "days_logged": len(logs),
        "consistency_pct": round(len(logs) / 30 * 100, 1)
    }


@router.get("/goals")
def ai_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = get_logs_for_range(current_user.id, 7, db)

    goals = []

    if not logs:
        return {
            "goals": [
                {"type": "physical", "goal": "Log your first check-in today to get personalized goals"},
            ]
        }

    avg_sleep = avg([l.sleep_hours for l in logs])
    avg_stress = avg([l.stress for l in logs])
    avg_exercise = avg([l.exercise_minutes for l in logs])
    avg_water = avg([l.water_glasses for l in logs])
    avg_mood = avg([l.mood for l in logs])

    # Physical goal
    if avg_sleep and avg_sleep < current_user.sleep_goal:
        goals.append({
            "type": "physical",
            "goal": f"Try to get {current_user.sleep_goal} hours of sleep tonight — you averaged {avg_sleep}h this week"
        })
    elif avg_exercise and avg_exercise < current_user.exercise_goal:
        goals.append({
            "type": "physical",
            "goal": f"Aim for {current_user.exercise_goal} min of movement today — you averaged {avg_exercise} min"
        })
    else:
        goals.append({"type": "physical", "goal": "Keep up your sleep routine — you're on track!"})

    # Mental goal
    if avg_stress and avg_stress > 6:
        goals.append({
            "type": "mental",
            "goal": "Your stress has been elevated. Try a 5-minute breathing exercise before your next task"
        })
    elif avg_mood and avg_mood < 5:
        goals.append({
            "type": "mental",
            "goal": "Write down 3 things you're grateful for today — small things count"
        })
    else:
        goals.append({"type": "mental", "goal": "You're doing well mentally — keep journaling to maintain momentum"})

    # Behavioral goal
    if avg_water and avg_water < current_user.water_goal:
        goals.append({
            "type": "behavioral",
            "goal": f"Drink {current_user.water_goal} glasses of water today — you averaged {avg_water} this week"
        })
    else:
        goals.append({"type": "behavioral", "goal": "Study in focused blocks today and take a proper break after each one"})

    return {"goals": goals, "based_on_days": len(logs)}


@router.get("/stability-score")
def stability_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = get_logs_for_range(current_user.id, 7, db)
    streak = db.query(Streak).filter(Streak.user_id == current_user.id).first()

    if not logs:
        return {"score": 0, "label": "No Data", "breakdown": {}}

    # Score components (each out of 100)
    mood_score = avg([l.mood for l in logs]) * 10           # mood avg × 10
    sleep_score = min(avg([l.sleep_hours for l in logs]) / current_user.sleep_goal * 100, 100)
    stress_score = max(0, (10 - avg([l.stress for l in logs])) * 10)  # inverted
    consistency_score = (len(logs) / 7) * 100               # how many days logged

    # Weighted average
    score = (
        mood_score * 0.30 +
        sleep_score * 0.25 +
        stress_score * 0.25 +
        consistency_score * 0.20
    )
    score = round(min(score, 100), 1)

    # Label
    if score >= 80:
        label = "Thriving"
    elif score >= 60:
        label = "Steady"
    elif score >= 40:
        label = "Building"
    else:
        label = "Needs Attention"

    return {
        "score": score,
        "label": label,
        "breakdown": {
            "mood": round(mood_score, 1),
            "sleep": round(sleep_score, 1),
            "stress_management": round(stress_score, 1),
            "consistency": round(consistency_score, 1)
        },
        "streak": {
            "log_streak": streak.log_streak if streak else 0,
            "study_streak": streak.study_streak if streak else 0,
            "sleep_streak": streak.sleep_streak if streak else 0
        }
    }