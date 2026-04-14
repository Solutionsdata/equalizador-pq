from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    return AuthService.create_user(db, data)


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login via form (OAuth2 padrão — compatível com /docs)."""
    return AuthService.login(db, form.username, form.password)


class LoginJSON:
    email: str
    password: str


from pydantic import BaseModel

class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/login-json", response_model=Token)
def login_json(body: LoginBody, db: Session = Depends(get_db)):
    """Login via JSON (usado pelo frontend React)."""
    return AuthService.login(db, body.email, body.password)
