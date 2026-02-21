from models.daily_log import DailyLog
from schemas.log_schema import TrendSummary
from typing import List


def analyze_patterns(logs: List[DailyLog]) -> TrendSummary:
    if not logs:
        return TrendSummary(
            mood_avg=5.0,
            sleep_avg=7.0,
            stress_avg=5.0,
            exercise_avg=0.0,
            mood_trend="stable",
            pattern_flags=[]
        )

    mood_avg = round(sum(l.mood for l in logs) / len(logs), 2)
    sleep_avg = round(sum(l.sleep_hours for l in logs) / len(logs), 2)
    stress_avg = round(sum(l.stress for l in logs) / len(logs), 2)
    exercise_avg = round(sum(l.exercise_minutes for l in logs) / len(logs), 2)

    # Mood trend: compare first half vs second half of the window
    mid = len(logs) // 2
    if len(logs) >= 4:
        recent_mood = sum(l.mood for l in logs[:mid]) / mid
        older_mood = sum(l.mood for l in logs[mid:]) / (len(logs) - mid)
        if recent_mood > older_mood + 0.5:
            mood_trend = "improving"
        elif recent_mood < older_mood - 0.5:
            mood_trend = "declining"
        else:
            mood_trend = "stable"
    else:
        mood_trend = "stable"

    # Pattern flags — combinations that signal risk
    pattern_flags = []

    if sleep_avg < 6.0 and stress_avg > 7.0:
        pattern_flags.append("low_sleep_high_stress")

    if mood_avg < 4.0:
        pattern_flags.append("persistently_low_mood")

    if stress_avg > 8.0:
        pattern_flags.append("chronic_high_stress")

    if sleep_avg < 5.0:
        pattern_flags.append("severe_sleep_deprivation")

    if exercise_avg < 10:
        pattern_flags.append("low_physical_activity")

    if mood_trend == "declining" and stress_avg > 6.5:
        pattern_flags.append("declining_mood_with_elevated_stress")

    return TrendSummary(
        mood_avg=mood_avg,
        sleep_avg=sleep_avg,
        stress_avg=stress_avg,
        exercise_avg=exercise_avg,
        mood_trend=mood_trend,
        pattern_flags=pattern_flags
    )