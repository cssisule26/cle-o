from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


class AIResponse(Base):
    __tablename__ = "ai_responses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    daily_log_id = Column(String, ForeignKey("daily_logs.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Leo's structured output stored as JSON
    content = Column(JSON, nullable=False)
    risk_level = Column(Float, default=0.0)     # 0.0 = safe, 1.0 = high risk

    # Relationships
    user = relationship("User", back_populates="ai_responses")
    daily_log = relationship("DailyLog", back_populates="ai_response")