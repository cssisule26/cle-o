import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SUPPORTED_FORMATS = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"}


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribes user's voice input to text using OpenAI Whisper.

    Args:
        audio_bytes: Raw audio file bytes from the frontend
        filename: Original filename with extension — Whisper uses this to detect format

    Returns:
        Transcribed text string
    """
    # Whisper expects a file-like tuple: (filename, bytes, content_type)
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=(filename, audio_bytes, "audio/webm"),
        language="en"
    )

    return transcript.text.strip()