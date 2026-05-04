from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_share import ProjectShare
from app.models.project_revision import ProjectRevision
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, SharedUserBrief

router = APIRouter()


def _has_access(db: Session, project_id: int, user_id: int) -> Project | None:
    """Returns project if the user is owner OR has a share record."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return None
    if project.user_id == user_id:
        return project
    share = db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id,
        ProjectShare.user_id == user_id,
    ).first()
    return project if share else None


def _to_response(project: Project, current_user_id: int) -> ProjectResponse:
    is_shared = project.user_id != current_user_id
    owner_nome = project.user.nome if is_shared else None
    shared_with = [
        SharedUserBrief(id=s.user.id, nome=s.user.nome, email=s.user.email)
        for s in project.shares
    ] if not is_shared else []
    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        nome=project.nome,
        descricao=project.descricao,
        numero_licitacao=project.numero_licitacao,
        tipo_obra=project.tipo_obra,
        extensao_km=project.extensao_km,
        spe_unidade=project.spe_unidade,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
        total_pq_items=len(project.pq_items),
        total_proposals=len(project.proposals),
        is_shared=is_shared,
        owner_nome=owner_nome,
        shared_with=shared_with,
    )


@router.get("/", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Owned projects
    owned = db.query(Project).filter(Project.user_id == current_user.id).all()

    # Shared projects (via project_shares)
    shared_ids = [
        s.project_id
        for s in db.query(ProjectShare).filter(ProjectShare.user_id == current_user.id).all()
    ]
    shared = db.query(Project).filter(Project.id.in_(shared_ids)).all() if shared_ids else []

    all_projects = owned + shared
    all_projects.sort(key=lambda p: p.created_at, reverse=True)
    return [_to_response(p, current_user.id) for p in all_projects]


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(**data.model_dump(), user_id=current_user.id)
    db.add(project)
    db.flush()
    revision0 = ProjectRevision(project_id=project.id, numero=0, descricao="Revisão inicial")
    db.add(revision0)
    db.commit()
    db.refresh(project)
    return _to_response(project, current_user.id)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _has_access(db, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return _to_response(project, current_user.id)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _has_access(db, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _to_response(project, current_user.id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only the owner can delete the project
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    db.delete(project)
    db.commit()
