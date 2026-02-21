from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.user import User
from models.daily_log import DailyLog
from models.ai_response import AIResponse
from schemas.log_schema import LeoRequest, LeoResponse
from services.pattern_analyzer import analyze_patterns
from services.leo_engine import generate_leo_response
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/leo", tags=["Leo AI"])


@router.post("/respond", response_model=LeoResponse)
def leo_respond(
    data: LeoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Step 1: Fetch the target log
    log = db.query(DailyLog).filter(
        DailyLog.id == data.daily_log_id,
        DailyLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Daily log not found")

    # Step 2: Return cached response if it exists
    existing = db.query(AIResponse).filter(
        AIResponse.daily_log_id == log.id
    ).first()

    if existing:
        return LeoResponse(**existing.content, risk_level=existing.risk_level)

    # Step 3: Pull last 7 logs for pattern analysis
    recent_logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id
    ).order_by(desc(DailyLog.date)).limit(7).all()

    # Step 4: Analyze patterns
    trends = analyze_patterns(recent_logs)

    # Step 5: Generate Leo's response
    response = generate_leo_response(log, trends)

    # Step 6: Save to DB
    saved = AIResponse(
        user_id=current_user.id,
        daily_log_id=log.id,
        content=response.model_dump(exclude={"risk_level"}),
        risk_level=response.risk_level
    )
    db.add(saved)
    db.commit()

    return response