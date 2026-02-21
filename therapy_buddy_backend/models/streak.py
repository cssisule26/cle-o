from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


class Streak(Base):
    __tablename__ = "streaks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Current streaks (consecutive days)
    log_streak = Column(Integer, default=0)         # daily check-in streak
    sleep_streak = Column(Integer, default=0)       # hit sleep goal streak
    study_streak = Column(Integer, default=0)       # studied at least once streak

    # Best ever
    log_streak_best = Column(Integer, default=0)
    sleep_streak_best = Column(Integer, default=0)
    study_streak_best = Column(Integer, default=0)

    # Last activity dates (to detect broken streaks)
    last_log_date = Column(Date, nullable=True)
    last_sleep_date = Column(Date, nullable=True)
    last_study_date = Column(Date, nullable=True)

    user = relationship("User", back_populates="streak")