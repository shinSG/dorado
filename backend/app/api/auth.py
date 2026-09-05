"""User API routes — registration, login, profile"""
import hashlib
import hmac
import time
import json
import base64
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple JWT secret (in production, use env var)
JWT_SECRET = "dorado-rust-learning-platform-2026"


class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: int
    username: str
    display_name: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(f"{JWT_SECRET}:{password}".encode()).hexdigest()


def _make_token(user_id: int, username: str) -> str:
    """Simple token generation (not full JWT, but functional)."""
    payload = json.dumps({"uid": user_id, "user": username, "exp": int(time.time()) + 86400 * 7})
    sig = hmac.new(JWT_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return base64.urlsafe_b64encode(f"{payload}|{sig}".encode()).decode()


def _verify_token(token: str) -> dict | None:
    """Verify token and return payload."""
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        payload_str, sig = decoded.rsplit("|", 1)
        expected_sig = hmac.new(JWT_SECRET.encode(), payload_str.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(payload_str)
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_current_user_id(token: str = "") -> str:
    """Extract user_id from token, default to 'local'."""
    if not token:
        return "local"
    payload = _verify_token(token)
    if payload:
        return str(payload["uid"])
    return "local"


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(400, "用户名已存在")
    if len(body.username) < 2 or len(body.password) < 4:
        raise HTTPException(400, "用户名至少2位，密码至少4位")

    user = User(
        username=body.username,
        password_hash=_hash_password(body.password),
        display_name=body.display_name or body.username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _make_token(user.id, user.username)
    return AuthResponse(token=token, user_id=user.id, username=user.username, display_name=user.display_name)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or user.password_hash != _hash_password(body.password):
        raise HTTPException(401, "用户名或密码错误")

    token = _make_token(user.id, user.username)
    return AuthResponse(token=token, user_id=user.id, username=user.username, display_name=user.display_name)


@router.get("/me")
def get_me(token: str = "", db: Session = Depends(get_db)):
    payload = _verify_token(token)
    if not payload:
        return {"user_id": "local", "username": "guest"}
    user = db.query(User).filter(User.id == payload["uid"]).first()
    if not user:
        return {"user_id": "local", "username": "guest"}
    return {"user_id": str(user.id), "username": user.username, "display_name": user.display_name}


# Re-export for other modules
def get_user_id_from_header(authorization: str = "") -> str:
    """Extract user ID from Authorization header."""
    if not authorization:
        return "local"
    token = authorization.replace("Bearer ", "")
    return get_current_user_id(token)
