from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Voice persona
    persona = Column(String, default="leo")     # "leo" or "cleo"

    # Wellness goals
    baseline_mood = Column(Float, nullable=True)
    sleep_goal = Column(Float, default=7.0)
    stress_goal = Column(Float, default=6.0)
    exercise_goal = Column(Integer, default=30)
    water_goal = Column(Integer, default=8)     # glasses per day

    # Relationships
    daily_logs = relationship("DailyLog", back_populates="user")
    ai_responses = relationship("AIResponse", back_populates="user")
    study_sessions = relationship("StudySession", back_populates="user")
    journal_entries = relationship("JournalEntry", back_populates="user")
    calendar_events = relationship("CalendarEvent", back_populates="user")
    streak = relationship("Streak", back_populates="user", uselist=False)