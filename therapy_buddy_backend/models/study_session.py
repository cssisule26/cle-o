from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session_type = Column(String, default="focus")       # "focus" or "pomodoro"
    duration_minutes = Column(Integer, nullable=False)   # actual time spent
    planned_minutes = Column(Integer, default=30)        # 30, 60, or 90
    subject = Column(String, nullable=True)
    completed = Column(Boolean, default=False)

    # Post-session check-in
    focus_rating = Column(Float, nullable=True)
    energy_rating = Column(Float, nullable=True)
    post_notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="study_sessions")