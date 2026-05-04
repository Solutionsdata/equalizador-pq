from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    password: str


class UserResponse(BaseModel):
    id: int
    nome: str
    email: str
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    is_active: bool
    is_admin: bool = False
    assinatura_ate: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    assinatura_ate: Optional[datetime] = None
    clear_assinatura: bool = False


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
