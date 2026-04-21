from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token
from app.services.auth import AuthService
from app.models.user import User
from app.models.user_login import UserLogin

router = APIRouter()


def _record_login(db: Session, user_id: int, request: Request):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    if ip:
        ip = ip.split(",")[0].strip()[:50]
    db.add(UserLogin(user_id=user_id, ip=ip))
    db.commit()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    return AuthService.create_user(db, data)


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), request: Request = None, db: Session = Depends(get_db)):
    """Login via form (OAuth2 padrão — compatível com /docs)."""
    result = AuthService.login(db, form.username, form.password)
    user = db.query(User).filter(User.email == form.username).first()
    if user and request:
        _record_login(db, user.id, request)
    return result


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/login-json", response_model=Token)
def login_json(body: LoginBody, request: Request, db: Session = Depends(get_db)):
    """Login via JSON (usado pelo frontend React)."""
    result = AuthService.login(db, body.email, body.password)
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        _record_login(db, user.id, request)
    return result
