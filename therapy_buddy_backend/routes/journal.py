from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.user import User
from models.journal import JournalEntry, JournalPin
from utils.auth_utils import get_current_user
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/journal", tags=["Journal"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Schemas ──────────────────────────────────────────────
class EntryCreate(BaseModel):
    title: Optional[str] = None
    content: str
    mood_tag: Optional[str] = None
    is_private: bool = False


class EntryOut(BaseModel):
    id: str
    title: Optional[str]
    content: str
    mood_tag: Optional[str]
    is_private: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PinSet(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6, description="4–6 digit PIN")


class PinVerify(BaseModel):
    pin: str


# ── PIN Management ────────────────────────────────────────
@router.post("/pin/set", status_code=201)
def set_pin(
    data: PinSet,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must contain digits only")

    existing = db.query(JournalPin).filter(JournalPin.user_id == current_user.id).first()
    hashed = pwd_context.hash(data.pin)

    if existing:
        existing.hashed_pin = hashed
    else:
        pin_record = JournalPin(user_id=current_user.id, hashed_pin=hashed)
        db.add(pin_record)

    db.commit()
    return {"message": "Journal PIN set successfully"}


@router.post("/pin/verify")
def verify_pin(
    data: PinVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pin_record = db.query(JournalPin).filter(JournalPin.user_id == current_user.id).first()
    if not pin_record:
        raise HTTPException(status_code=404, detail="No PIN set. Set one first.")

    if not pwd_context.verify(data.pin, pin_record.hashed_pin):
        raise HTTPException(status_code=401, detail="Incorrect PIN")

    return {"verified": True, "message": "PIN correct — journal unlocked"}


@router.delete("/pin")
def remove_pin(
    data: PinVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pin_record = db.query(JournalPin).filter(JournalPin.user_id == current_user.id).first()
    if not pin_record or not pwd_context.verify(data.pin, pin_record.hashed_pin):
        raise HTTPException(status_code=401, detail="Incorrect PIN")

    db.delete(pin_record)
    db.commit()
    return {"message": "PIN removed"}


# ── Journal Entries ───────────────────────────────────────
@router.post("", response_model=EntryOut, status_code=201)
def create_entry(
    data: EntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = JournalEntry(
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        mood_tag=data.mood_tag,
        is_private=data.is_private
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=List[EntryOut])
def get_entries(
    include_private: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(JournalEntry).filter(JournalEntry.user_id == current_user.id)
    if not include_private:
        query = query.filter(JournalEntry.is_private == False)
    return query.order_by(desc(JournalEntry.created_at)).all()


@router.get("/{entry_id}", response_model=EntryOut)
def get_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.patch("/{entry_id}", response_model=EntryOut)
def update_entry(
    entry_id: str,
    data: EntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry.title = data.title
    entry.content = data.content
    entry.mood_tag = data.mood_tag
    entry.is_private = data.is_private
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()