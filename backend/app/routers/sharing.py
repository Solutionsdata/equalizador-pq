from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_share import ProjectShare

router = APIRouter()


def _require_owner(db: Session, project_id: int, user_id: int) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project


class ShareCreate(BaseModel):
    user_id: int


@router.get("/projects/{project_id}/shares")
def list_shares(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_owner(db, project_id, current_user.id)
    shares = db.query(ProjectShare).filter(ProjectShare.project_id == project_id).all()
    return [
        {"id": s.user_id, "nome": s.user.nome, "email": s.user.email, "created_at": s.created_at}
        for s in shares
    ]


@router.post("/projects/{project_id}/shares", status_code=status.HTTP_201_CREATED)
def add_share(
    project_id: int,
    data: ShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_owner(db, project_id, current_user.id)
    if data.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível compartilhar consigo mesmo")
    target = db.query(User).filter(User.id == data.user_id, User.is_active == True).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    existing = db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id,
        ProjectShare.user_id == data.user_id,
    ).first()
    if existing:
        return {"id": target.id, "nome": target.nome, "email": target.email}
    share = ProjectShare(
        project_id=project_id,
        user_id=data.user_id,
        shared_by_id=current_user.id,
    )
    db.add(share)
    db.commit()
    return {"id": target.id, "nome": target.nome, "email": target.email}


@router.delete("/projects/{project_id}/shares/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_share(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_owner(db, project_id, current_user.id)
    share = db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id,
        ProjectShare.user_id == user_id,
    ).first()
    if share:
        db.delete(share)
        db.commit()


@router.get("/users/list")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all active users (excluding current user) for the sharing picker."""
    users = (
        db.query(User)
        .filter(User.is_active == True, User.id != current_user.id)  # noqa: E712
        .order_by(User.nome)
        .all()
    )
    return [{"id": u.id, "nome": u.nome, "email": u.email} for u in users]
