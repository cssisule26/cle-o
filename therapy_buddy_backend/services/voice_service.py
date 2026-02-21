import os
import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.user import User
from models.daily_log import DailyLog
from services.transcription_service import transcribe_audio
from services.leo_engine import generate_leo_response
from services.pattern_analyzer import analyze_patterns
from services.voice_service import text_to_speech, get_available_voices
from services.risk_detector import detect_risk, CRISIS_RESPONSE
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/text-to-speech")
def tts_endpoint(
    text: str,
    current_user: User = Depends(get_current_user)
):
    """
    Convert Leo/Cleo text to speech via ElevenLabs.
    Frontend calls this after every text reply to speak it aloud.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if len(text) > 2500:
        raise HTTPException(status_code=400, detail="Text too long (max 2500 chars)")

    try:
        audio_bytes = text_to_speech(text.strip(), persona=current_user.persona)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ElevenLabs error: {str(e)}")

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"X-Persona": current_user.persona}
    )


@router.post("/speak")
async def voice_conversation(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Full voice pipeline:
    1. User audio → Whisper transcription (OpenAI)
    2. Text → Leo/Cleo engine
    3. Response → ElevenLabs TTS
    4. Return MP3 stream with transcript in headers
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio received")

    # Step 1: Transcribe
    try:
        user_text = transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Transcription failed: {str(e)}")

    if not user_text:
        raise HTTPException(status_code=422, detail="Could not understand audio")

    # Step 2: Risk check
    risk_score, requires_escalation = detect_risk(user_text)
    if requires_escalation:
        try:
            audio_out = text_to_speech(CRISIS_RESPONSE, persona=current_user.persona)
            return StreamingResponse(
                io.BytesIO(audio_out), media_type="audio/mpeg",
                headers={"X-Transcript": user_text, "X-Risk-Level": str(risk_score), "X-Escalated": "true"}
            )
        except Exception:
            return JSONResponse(content={"transcript": user_text, "response": CRISIS_RESPONSE, "risk_level": risk_score})

    # Step 3: Get Leo's response
    recent_logs = db.query(DailyLog).filter(
        DailyLog.user_id == current_user.id
    ).order_by(desc(DailyLog.date)).limit(7).all()

    trends = analyze_patterns(recent_logs)
    today_log = recent_logs[0] if recent_logs else None

    if today_log:
        original_notes = today_log.notes or ""
        today_log.notes = f"{original_notes} [Voice]: {user_text}".strip()
        db.commit()
        leo_response = generate_leo_response(today_log, trends)
        spoken_text = f"{leo_response.summary} {leo_response.encouragement}"
        risk_level = str(leo_response.risk_level)
    else:
        spoken_text = (
            f"I hear you — before I can give my best support, "
            f"could you do your quick daily check-in first? It only takes a minute."
        )
        risk_level = "0.0"

    # Step 4: Convert to ElevenLabs speech
    try:
        audio_out = text_to_speech(spoken_text, persona=current_user.persona)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ElevenLabs error: {str(e)}")

    return StreamingResponse(
        io.BytesIO(audio_out),
        media_type="audio/mpeg",
        headers={
            "X-Transcript": user_text[:500],
            "X-Risk-Level": risk_level,
            "X-Persona": current_user.persona,
            "X-Escalated": "false",
        }
    )


@router.get("/voices")
def list_voices(current_user: User = Depends(get_current_user)):
    """List all ElevenLabs voices — useful for finding your Leo/Cleo voice IDs."""
    try:
        voices = get_available_voices()
        return {
            "voices": voices,
            "configured": {
                "leo":  bool(os.getenv("LEO_VOICE_ID")),
                "cleo": bool(os.getenv("CLEO_VOICE_ID")),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))