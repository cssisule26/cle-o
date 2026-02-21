from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime, date


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Core wellness inputs (1–10 scale)
    mood = Column(Float, nullable=False)        # 1 = very low, 10 = excellent
    stress = Column(Float, nullable=False)      # 1 = none, 10 = extreme
    sleep_hours = Column(Float, nullable=False)
    exercise_minutes = Column(Integer, default=0)
    notes = Column(Text, nullable=True)         # Free text — Leo reads this

    # Relationships
    user = relationship("User", back_populates="daily_logs")
    ai_response = relationship("AIResponse", back_populates="daily_log", uselist=False)