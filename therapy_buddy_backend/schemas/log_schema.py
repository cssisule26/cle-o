from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class LogCreate(BaseModel):
    mood: float = Field(..., ge=1, le=10)
    stress: float = Field(..., ge=1, le=10)
    sleep_hours: float = Field(..., ge=0, le=24)
    exercise_minutes: int = Field(default=0, ge=0)
    notes: Optional[str] = None


class LogOut(BaseModel):
    id: str
    user_id: str
    date: date
    mood: float
    stress: float
    sleep_hours: float
    exercise_minutes: int
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TrendSummary(BaseModel):
    mood_avg: float
    sleep_avg: float
    stress_avg: float
    exercise_avg: float
    mood_trend: str
    pattern_flags: List[str]


class LeoRequest(BaseModel):
    daily_log_id: str


class LeoResponse(BaseModel):
    summary: str
    physical_adjustment: str
    mental_reframe: str
    behavioral_action: str
    encouragement: str
    risk_level: float
    trend_summary: Optional[TrendSummary] = None
    