from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user_schema import UserOut, PersonaUpdate
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.patch("/persona", response_model=UserOut)
def switch_persona(
    data: PersonaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Switch between Leo (male) and Cleo (female).
    Can be called from onboarding or settings screen.
    """
    if data.persona == current_user.persona:
        raise HTTPException(
            status_code=400,
            detail=f"You're already using {data.persona.capitalize()}."
        )

    current_user.persona = data.persona
    db.commit()
    db.refresh(current_user)

    return current_user


@router.get("/me", response_model=UserOut)
def get_settings(current_user: User = Depends(get_current_user)):
    """Returns the current user's full settings including active persona."""
    return current_user


@router.patch("/goals", response_model=UserOut)
def update_goals(
    sleep_goal: float = None,
    stress_goal: float = None,
    exercise_goal: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update wellness goals (sleep hours, stress target, exercise minutes)."""
    if sleep_goal is not None:
        if not (1 <= sleep_goal <= 12):
            raise HTTPException(status_code=400, detail="Sleep goal must be between 1–12 hours")
        current_user.sleep_goal = sleep_goal

    if stress_goal is not None:
        if not (1 <= stress_goal <= 10):
            raise HTTPException(status_code=400, detail="Stress goal must be between 1–10")
        current_user.stress_goal = stress_goal

    if exercise_goal is not None:
        if not (0 <= exercise_goal <= 300):
            raise HTTPException(status_code=400, detail="Exercise goal must be between 0–300 minutes")
        current_user.exercise_goal = exercise_goal

    db.commit()
    db.refresh(current_user)
    return current_user