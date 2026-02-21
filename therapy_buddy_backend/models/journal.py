from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    mood_tag = Column(String, nullable=True)        # e.g. "anxious", "happy", "tired"
    is_private = Column(Boolean, default=False)     # private mode flag

    user = relationship("User", back_populates="journal_entries")


class JournalPin(Base):
    __tablename__ = "journal_pins"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    hashed_pin = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)