from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    persona: Literal["leo", "cleo"] = "leo"   # Pick at signup


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    created_at: datetime
    sleep_goal: float
    stress_goal: float
    exercise_goal: int
    baseline_mood: Optional[float] = None
    persona: str = "leo"

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PersonaUpdate(BaseModel):
    persona: Literal["leo", "cleo"]