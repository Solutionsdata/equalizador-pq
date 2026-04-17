"""
Router de monitoramento para administradores.
Expõe estatísticas do banco, projetos de todos os usuários e logs de atividade.
"""
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
from app.models.activity_log import ActivityLog

router = APIRouter()


# ── Overview ─────────────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    hoje = datetime.utcnow().date()
    inicio_hoje = datetime(hoje.year, hoje.month, hoje.day)

    total_users    = db.query(func.count(User.id)).scalar()
    ativos         = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    total_projects = db.query(func.count(Project.id)).scalar()
    total_proposals= db.query(func.count(Proposal.id)).scalar()
    total_items    = db.query(func.count(PQItem.id)).scalar()

    acessos_hoje   = (
        db.query(func.count(ActivityLog.id))
        .filter(ActivityLog.timestamp >= inicio_hoje)
        .scalar()
    )
    usuarios_hoje  = (
        db.query(func.count(func.distinct(ActivityLog.user_id)))
        .filter(ActivityLog.timestamp >= inicio_hoje)
        .scalar()
    )

    return {
        "total_users": total_users,
        "users_ativos": ativos,
        "total_projects": total_projects,
        "total_proposals": total_proposals,
        "total_items": total_items,
        "acessos_hoje": acessos_hoje,
        "usuarios_hoje": usuarios_hoje,
    }


# ── Banco de dados ────────────────────────────────────────────────────────────

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
            {
                "tabela": r.tabela,
                "linhas": r.linhas,
                "bytes": r.bytes,
                "tamanho": r.tamanho,
            }
            for r in tables
        ],
    }


# ── Projetos de todos os usuários ─────────────────────────────────────────────

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
        n_props  = len(proj.proposals)
        n_items  = len(proj.pq_items)
        result.append({
            "id": proj.id,
            "nome": proj.nome,
            "status": proj.status,
            "tipo_obra": proj.tipo_obra,
            "numero_licitacao": proj.numero_licitacao,
            "created_at": proj.created_at.isoformat(),
            "updated_at": proj.updated_at.isoformat() if proj.updated_at else None,
            "total_proposals": n_props,
            "total_items": n_items,
            "usuario": {
                "id": user.id,
                "nome": user.nome,
                "email": user.email,
                "empresa": user.empresa,
            },
        })
    return result


# ── Atividade ─────────────────────────────────────────────────────────────────

@router.get("/activity")
def get_activity(
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    since = datetime.utcnow() - timedelta(days=days)

    # Últimos 200 acessos individuais
    logs = (
        db.query(ActivityLog, User)
        .outerjoin(User, ActivityLog.user_id == User.id)
        .filter(ActivityLog.timestamp >= since)
        .order_by(ActivityLog.timestamp.desc())
        .limit(200)
        .all()
    )

    # Acessos por dia
    daily = db.execute(text("""
        SELECT
            DATE(timestamp AT TIME ZONE 'UTC') AS dia,
            COUNT(*)                           AS total,
            COUNT(DISTINCT user_id)            AS usuarios
        FROM activity_logs
        WHERE timestamp >= :since
        GROUP BY DATE(timestamp AT TIME ZONE 'UTC')
        ORDER BY dia
    """), {"since": since}).fetchall()

    # Páginas mais acessadas
    top_pages = db.execute(text("""
        SELECT pagina, COUNT(*) AS total
        FROM activity_logs
        WHERE timestamp >= :since
        GROUP BY pagina
        ORDER BY total DESC
        LIMIT 20
    """), {"since": since}).fetchall()

    # Usuários mais ativos
    top_users = db.execute(text("""
        SELECT u.nome, u.email, u.empresa, COUNT(a.id) AS total
        FROM activity_logs a
        JOIN users u ON a.user_id = u.id
        WHERE a.timestamp >= :since
        GROUP BY u.id, u.nome, u.email, u.empresa
        ORDER BY total DESC
        LIMIT 10
    """), {"since": since}).fetchall()

    return {
        "logs": [
            {
                "id": log.id,
                "pagina": log.pagina,
                "timestamp": log.timestamp.isoformat(),
                "ip": log.ip,
                "usuario": {
                    "id": user.id,
                    "nome": user.nome,
                    "email": user.email,
                } if user else None,
            }
            for log, user in logs
        ],
        "daily": [
            {"dia": str(r.dia), "total": r.total, "usuarios": r.usuarios}
            for r in daily
        ],
        "top_pages": [
            {"pagina": r.pagina, "total": r.total}
            for r in top_pages
        ],
        "top_users": [
            {"nome": r.nome, "email": r.email, "empresa": r.empresa, "total": r.total}
            for r in top_users
        ],
    }
