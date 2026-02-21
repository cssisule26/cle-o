from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user_schema import UserRegister, UserLogin, UserOut, TokenOut
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from utils.auth_utils import get_current_user, create_access_token
import os

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "fallback_secret_change_this")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = pwd_context.hash(data.password[:72])
    
    user = User(
        email=data.email,
        hashed_password=hashed,
        persona=data.persona or "leo"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=TokenOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return current_user


#from utils.auth_utils import get_current_user  # noqa — bottom import avoids circular