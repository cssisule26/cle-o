from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./therapybuddy.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite only
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency — used in every route to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()