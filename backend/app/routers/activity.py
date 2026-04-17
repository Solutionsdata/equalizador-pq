"""
Endpoint para registro de acessos a páginas (chamado pelo frontend em cada navegação).
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.activity_log import ActivityLog
from app.models.user import User

router = APIRouter()


class ActivityIn(BaseModel):
    pagina: str


@router.post("/activity", status_code=204)
def log_activity(
    body: ActivityIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    if ip:
        ip = ip.split(",")[0].strip()[:50]

    entry = ActivityLog(
        user_id=user.id,
        pagina=body.pagina[:200],
        ip=ip,
    )
    db.add(entry)
    db.commit()
