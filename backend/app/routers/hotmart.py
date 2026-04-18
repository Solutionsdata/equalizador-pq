"""Webhook Hotmart — ativa/renova/bloqueia assinaturas automaticamente."""
import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import Session
from app.config import settings
from app.database import Base, get_db
from app.models.user import User
from app.utils.email import send_activation_email, send_subscription_renewed_email

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Modelo de token de ativação ───────────────────────────────────────────────
class ActivationToken(Base):
    __tablename__ = "activation_tokens"
    id         = Column(Integer, primary_key=True)
    token      = Column(String(64), unique=True, index=True, nullable=False)
    email      = Column(String(200), nullable=False)
    expires_at = Column(DateTime, nullable=False)

# ── Eventos Hotmart que ATIVAM o acesso ──────────────────────────────────────
ACTIVATE_EVENTS = {
    "PURCHASE_APPROVED",
    "PURCHASE_COMPLETE",
    "PURCHASE_BILLET_PRINTED",   # boleto gerado — acesso antecipado
}

# ── Eventos Hotmart que EXPIRAM o acesso ────────────────────────────────────
EXPIRE_EVENTS = {
    "PURCHASE_CANCELED",
    "PURCHASE_REFUNDED",
    "PURCHASE_CHARGEBACK",
    "SUBSCRIPTION_CANCELLATION",
}

def _subscription_days(payment_mode: str) -> int:
    """Retorna quantos dias adicionar com base no modo de pagamento."""
    mode = (payment_mode or "").upper()
    if "ANNUAL" in mode or "YEARLY" in mode:
        return 370   # anual + margem
    return 33        # mensal + margem (inclui trial)


def _get_or_create_user(db: Session, email: str, nome: str) -> tuple[User, bool]:
    """Retorna (user, is_new)."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False
    # Cria com senha aleatória — será substituída na ativação
    from app.services.auth import AuthService
    user = User(
        nome=nome or email.split("@")[0],
        email=email,
        hashed_password=AuthService.hash_password(secrets.token_hex(16)),
        is_active=True,
        is_admin=False,
    )
    db.add(user)
    db.flush()   # garante user.id sem commit
    return user, True


def _create_activation_token(db: Session, email: str) -> str:
    token = secrets.token_urlsafe(32)
    # Remove tokens antigos do mesmo e-mail
    db.query(ActivationToken).filter(ActivationToken.email == email).delete()
    db.add(ActivationToken(
        token=token,
        email=email,
        expires_at=datetime.utcnow() + timedelta(hours=72),
    ))
    return token


# ── Webhook endpoint ──────────────────────────────────────────────────────────
@router.post("/hotmart/webhook", tags=["Hotmart"])
async def hotmart_webhook(
    request: Request,
    hottok: str = Query(default=""),
    db: Session = Depends(get_db),
):
    # 1. Verifica token de segurança (ignorado se HOTMART_HOTTOK não configurado)
    if settings.HOTMART_HOTTOK and hottok != settings.HOTMART_HOTTOK:
        logger.warning("Webhook Hotmart — hottok inválido: %s", hottok)
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    event = body.get("event", "")
    data  = body.get("data", {})

    buyer    = data.get("buyer", {})
    purchase = data.get("purchase", {})

    email = (buyer.get("email") or "").strip().lower()
    nome  = buyer.get("name") or ""
    payment_mode = purchase.get("offer", {}).get("payment_mode", "MONTHLY_SUBSCRIPTION")

    logger.info("Hotmart webhook → event=%s email=%s mode=%s", event, email, payment_mode)

    if not email:
        return {"ok": True, "msg": "no email — ignored"}

    # 2. Eventos de ativação
    if event in ACTIVATE_EVENTS:
        user, is_new = _get_or_create_user(db, email, nome)
        days = _subscription_days(payment_mode)
        base = max(user.assinatura_ate or datetime.utcnow(), datetime.utcnow())
        user.assinatura_ate = base + timedelta(days=days)
        user.is_active = True

        if is_new:
            token = _create_activation_token(db, email)
            db.commit()
            send_activation_email(email, nome, token)
            logger.info("Novo usuário criado via Hotmart: %s", email)
        else:
            db.commit()
            ate_fmt = user.assinatura_ate.strftime("%d/%m/%Y")
            send_subscription_renewed_email(email, user.nome, ate_fmt)
            logger.info("Assinatura renovada: %s até %s", email, ate_fmt)

        return {"ok": True, "action": "activated", "days": days}

    # 3. Eventos de expiração
    if event in EXPIRE_EVENTS:
        user = db.query(User).filter(User.email == email).first()
        if user and not user.is_admin:
            user.assinatura_ate = datetime.utcnow() - timedelta(seconds=1)
            db.commit()
            logger.info("Assinatura expirada via Hotmart: %s", email)
        return {"ok": True, "action": "expired"}

    return {"ok": True, "action": "ignored", "event": event}


# ── Endpoint de ativação de conta ─────────────────────────────────────────────
from pydantic import BaseModel

class ActivateBody(BaseModel):
    token: str
    nome: str
    password: str

@router.post("/auth/activate", tags=["Autenticação"])
def activate_account(body: ActivateBody, db: Session = Depends(get_db)):
    """Comprador define nome e senha após receber o link de ativação."""
    record = (
        db.query(ActivationToken)
        .filter(ActivationToken.token == body.token)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Token inválido ou já utilizado.")
    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Token expirado. Entre em contato com o suporte.")

    user = db.query(User).filter(User.email == record.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    from app.services.auth import AuthService
    user.nome = body.nome.strip() or user.nome
    user.hashed_password = AuthService.hash_password(body.password)
    user.is_active = True
    db.delete(record)
    db.commit()

    # Faz login automático
    from app.schemas.user import UserResponse, Token
    return Token(
        access_token=AuthService.create_access_token(user.id),
        user=UserResponse.model_validate(user),
    )


@router.get("/auth/activate/check", tags=["Autenticação"])
def check_activation_token(token: str, db: Session = Depends(get_db)):
    """Valida se um token de ativação ainda é válido e retorna o e-mail."""
    record = (
        db.query(ActivationToken)
        .filter(ActivationToken.token == token)
        .first()
    )
    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=404, detail="Token inválido ou expirado.")
    return {"email": record.email, "valid": True}
