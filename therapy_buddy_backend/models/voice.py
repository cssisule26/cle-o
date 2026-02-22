import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
from io import BytesIO

load_dotenv()

router = APIRouter()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")


VOICE_IDS = {
    "leo": os.getenv("LEO_VOICE_ID"),
    "cleo": os.getenv("CLEO_VOICE_ID"),
}

VOICE_SETTINGS = {
    "leo":  { "stability": 0.55, "similarity_boost": 0.80, "style": 0.20, "use_speaker_boost": True },
    "cleo": { "stability": 0.50, "similarity_boost": 0.85, "style": 0.30, "use_speaker_boost": True },
}

client = ElevenLabs(api_key=ELEVENLABS_API_KEY)


def text_to_speech(text: str, persona: str = "leo") -> bytes:
    voice_id = VOICE_IDS.get(persona)
    if not voice_id:
        raise ValueError(f"No voice ID configured for persona '{persona}'")

    settings = VOICE_SETTINGS.get(persona, VOICE_SETTINGS["leo"])

    audio_generator = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id="eleven_turbo_v2_5",
        output_format="mp3_44100_128",
        voice_settings=settings,
    )

    return b"".join(audio_generator)


@router.post("/tts")
def generate_tts(text: str, persona: str = "leo"):
    """
    Generate speech from text.
    """
    try:
        audio_bytes = text_to_speech(text, persona)
        print(len(audio_bytes))

        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/mpeg"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/voices")
def list_voices():
    response = client.voices.get_all()
    return [{"name": v.name, "voice_id": v.voice_id} for v in response.voices]

