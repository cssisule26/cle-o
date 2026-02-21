from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from database import get_db
from models.user import User
from dotenv import load_dotenv
from datetime import datetime, timedelta
from jose import jwt
import os

load_dotenv()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv("JWT_SECRET"), algorithm=os.getenv("JWT_ALGORITHM", "HS256"))


JWT_SECRET = os.getenv("JWT_SECRET", "fallback_secret_change_this")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user