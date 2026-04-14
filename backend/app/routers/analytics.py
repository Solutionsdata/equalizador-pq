from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.schemas.analytics import ParetoData, EqualizationResponse, DisciplineSummary, CategoriaSummary
from app.services.analytics import AnalyticsService
from app.services.excel import gerar_relatorio_equalizacao

router = APIRouter()


@router.get("/pareto/{project_id}", response_model=ParetoData)
def get_pareto(
    project_id: int,
    source: str = Query(default="referencia", enum=["referencia", "propostas"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Curva ABC / Pareto dos itens do projeto."""
    return AnalyticsService.get_pareto(db, project_id, source)


@router.get("/equalization/{project_id}", response_model=EqualizationResponse)
def get_equalization(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tabela de equalização — todas as propostas lado a lado."""
    return AnalyticsService.get_equalization(db, project_id)


@router.get("/disciplines/{project_id}", response_model=list[DisciplineSummary])
def get_disciplines(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService.get_discipline_summary(db, project_id)


@router.get("/categorias/{project_id}", response_model=list[CategoriaSummary])
def get_categorias(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService.get_categoria_summary(db, project_id)


@router.get("/export/{project_id}")
def export_analytics_excel(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta relatório completo de equalização em Excel (5 abas)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    eq_data = AnalyticsService.get_equalization(db, project_id)
    pareto_data = AnalyticsService.get_pareto(db, project_id, "referencia")

    # Converte para dict serializável
    def _to_dict(obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        if hasattr(obj, "dict"):
            return obj.dict()
        return {}

    buf = gerar_relatorio_equalizacao(
        project.nome,
        _to_dict(eq_data),
        _to_dict(pareto_data),
    )
    safe_name = "".join(c for c in project.nome if c.isalnum() or c in " _-")[:40]
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="equalizacao_{safe_name}.xlsx"'
        },
    )
