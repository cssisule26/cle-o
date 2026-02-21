from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    title = Column(String, nullable=False)
    event_type = Column(String, nullable=False)     # "exam", "assignment", "class", "other"
    subject = Column(String, nullable=True)         # e.g. "Biology", "Math"
    due_date = Column(Date, nullable=False)
    due_time = Column(String, nullable=True)        # e.g. "14:00"
    location = Column(String, nullable=True)        # e.g. "Room 204"
    notes = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)

    user = relationship("User", back_populates="calendar_events")