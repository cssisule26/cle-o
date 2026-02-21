from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes.auth import router as auth_router
from routes.logs import router as logs_router
from routes.leo import router as leo_router
from routes.voice import router as voice_router
from routes.settings import router as settings_router
from routes.study import router as study_router
from routes.journal import router as journal_router
from routes.calendar_routes import router as calendar_router
from routes.insights import router as insights_router
from routes.streaks import router as streaks_router

import models  # noqa — registers all models with SQLAlchemy
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Therapy Buddy — Leo & Cleo Backend",
    description="Student mental wellness API — mood, study, journal, streaks & voice",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Transcript", "X-Risk-Level", "X-Persona", "X-Mood-Trend", "X-Escalated"]
)

app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(leo_router)
app.include_router(voice_router)
app.include_router(settings_router)
app.include_router(study_router)
app.include_router(journal_router)
app.include_router(calendar_router)
app.include_router(insights_router)
app.include_router(streaks_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "Leo & Cleo are online 💙",
        "version": "2.0.0",
        "docs": "/docs",
        "features": [
            "mood tracking", "voice chat", "study mode",
            "journal", "calendar", "streaks", "trends"
        ]
    }