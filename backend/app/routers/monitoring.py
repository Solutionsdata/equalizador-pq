from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models.user import User
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.pq_item import PQItem
from app.models.user_login import UserLogin

router = APIRouter()


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    hoje = datetime.utcnow().date()
    inicio_hoje = datetime(hoje.year, hoje.month, hoje.day)

    total_users     = db.query(func.count(User.id)).scalar()
    ativos          = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    total_projects  = db.query(func.count(Project.id)).scalar()
    total_proposals = db.query(func.count(Proposal.id)).scalar()
    total_items     = db.query(func.count(PQItem.id)).scalar()

    logins_hoje  = (
        db.query(func.count(UserLogin.id))
        .filter(UserLogin.logged_at >= inicio_hoje)
        .scalar()
    )
    usuarios_hoje = (
        db.query(func.count(func.distinct(UserLogin.user_id)))
        .filter(UserLogin.logged_at >= inicio_hoje)
        .scalar()
    )

    return {
        "total_users": total_users,
        "users_ativos": ativos,
        "total_projects": total_projects,
        "total_proposals": total_proposals,
        "total_items": total_items,
        "acessos_hoje": logins_hoje,
        "usuarios_hoje": usuarios_hoje,
    }


@router.get("/db")
def get_db_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    db_size = db.execute(
        text("SELECT pg_database_size(current_database()) AS bytes")
    ).fetchone()

    tables = db.execute(text("""
        SELECT
            relname                                            AS tabela,
            n_live_tup                                         AS linhas,
            pg_total_relation_size(relid)                      AS bytes,
            pg_size_pretty(pg_total_relation_size(relid))      AS tamanho
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
    """)).fetchall()

    limit_bytes = 512 * 1024 * 1024  # 500 MB free tier Neon

    return {
        "db_bytes": db_size.bytes if db_size else 0,
        "db_mb": round((db_size.bytes or 0) / 1024 / 1024, 2),
        "limit_mb": 500,
        "uso_pct": round((db_size.bytes or 0) / limit_bytes * 100, 2),
        "tabelas": [
            {"tabela": r.tabela, "linhas": r.linhas, "bytes": r.bytes, "tamanho": r.tamanho}
            for r in tables
        ],
    }


@router.get("/projects")
def get_all_projects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    rows = (
        db.query(Project, User)
        .join(User, Project.user_id == User.id)
        .order_by(Project.created_at.desc())
        .all()
    )

    result = []
    for proj, user in rows:
        result.append({
            "id": proj.id,
            "nome": proj.nome,
            "status": proj.status,
            "tipo_obra": proj.tipo_obra,
            "numero_licitacao": proj.numero_licitacao,
            "created_at": proj.created_at.isoformat(),
            "updated_at": proj.updated_at.isoformat() if proj.updated_at else None,
            "total_proposals": len(proj.proposals),
            "total_items": len(proj.pq_items),
            "usuario": {
                "id": user.id,
                "nome": user.nome,
                "email": user.email,
                "empresa": user.empresa,
            },
        })
    return result


@router.get("/activity")
def get_activity(
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    since = datetime.utcnow() - timedelta(days=days)

    # Últimos 100 logins
    logs = (
        db.query(UserLogin, User)
        .outerjoin(User, UserLogin.user_id == User.id)
        .filter(UserLogin.logged_at >= since)
        .order_by(UserLogin.logged_at.desc())
        .limit(100)
        .all()
    )

    # Logins por dia
    daily = db.execute(text("""
        SELECT
            DATE(logged_at AT TIME ZONE 'UTC') AS dia,
            COUNT(*)                            AS total,
            COUNT(DISTINCT user_id)             AS usuarios
        FROM user_logins
        WHERE logged_at >= :since
        GROUP BY DATE(logged_at AT TIME ZONE 'UTC')
        ORDER BY dia
    """), {"since": since}).fetchall()

    # Usuários por número de logins
    top_users = db.execute(text("""
        SELECT u.nome, u.email, u.empresa, COUNT(l.id) AS total
        FROM user_logins l
        JOIN users u ON l.user_id = u.id
        WHERE l.logged_at >= :since
        GROUP BY u.id, u.nome, u.email, u.empresa
        ORDER BY total DESC
        LIMIT 10
    """), {"since": since}).fetchall()

    return {
        "logs": [
            {
                "id": login.id,
                "timestamp": login.logged_at.isoformat(),
                "ip": login.ip,
                "usuario": {
                    "id": user.id,
                    "nome": user.nome,
                    "email": user.email,
                } if user else None,
            }
            for login, user in logs
        ],
        "daily": [
            {"dia": str(r.dia), "total": r.total, "usuarios": r.usuarios}
            for r in daily
        ],
        "top_users": [
            {"nome": r.nome, "email": r.email, "empresa": r.empresa, "total": r.total}
            for r in top_users
        ],
    }
