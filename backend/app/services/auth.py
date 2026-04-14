from datetime import datetime, timedelta
from fastapi import HTTPException, status
import bcrypt
from jose import jwt
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, Token, UserResponse


class AuthService:

    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

    @staticmethod
    def create_access_token(user_id: int) -> str:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode(
            {"sub": str(user_id), "exp": expire},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

    @staticmethod
    def create_user(db: Session, data: UserCreate) -> User:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado",
            )
        # Primeiro usuário do sistema vira administrador e já fica ativo.
        # Demais usuários ficam inativos até aprovação do administrador.
        is_first = db.query(User).count() == 0
        user = User(
            nome=data.nome,
            email=data.email,
            empresa=data.empresa,
            cargo=data.cargo,
            hashed_password=AuthService.hash_password(data.password),
            is_admin=is_first,
            is_active=is_first,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def login(db: Session, email: str, password: str) -> Token:
        user = db.query(User).filter(User.email == email).first()
        if not user or not AuthService.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha inválidos",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta pendente de aprovação ou desativada. Entre em contato com o administrador.",
            )
        # Verifica assinatura vencida (admins ficam isentos)
        if not user.is_admin and user.assinatura_ate and user.assinatura_ate < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Assinatura vencida. Renove para continuar acessando.",
            )
        return Token(
            access_token=AuthService.create_access_token(user.id),
            user=UserResponse.model_validate(user),
        )
