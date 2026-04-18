from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.config import settings
from app.routers import auth, projects, pq, proposals, analytics, admin, revisions
from app.routers import monitoring, activity, hotmart

# Cria tabelas novas e adiciona colunas ausentes (migração simples sem Alembic)
Base.metadata.create_all(bind=engine)

with engine.connect() as _conn:
    _conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    _conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_ate TIMESTAMP"
    ))
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id        SERIAL PRIMARY KEY,
            user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
            pagina    VARCHAR(200) NOT NULL,
            timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
            ip        VARCHAR(50)
        )
    """))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_activity_logs_timestamp ON activity_logs (timestamp)"
    ))
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS project_revisions (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            numero INTEGER NOT NULL DEFAULT 0,
            descricao TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_revision_project_numero UNIQUE (project_id, numero)
        )
    """))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_project_revisions_project_id ON project_revisions (project_id)"
    ))
    # Create Rev 0 for all existing projects that don't have one
    _conn.execute(text("""
        INSERT INTO project_revisions (project_id, numero, descricao, created_at)
        SELECT p.id, 0, 'Revisão inicial', p.created_at
        FROM projects p
        WHERE NOT EXISTS (
            SELECT 1 FROM project_revisions r WHERE r.project_id = p.id
        )
    """))
    # Add revision_id to pq_items
    _conn.execute(text(
        "ALTER TABLE pq_items ADD COLUMN IF NOT EXISTS revision_id INTEGER REFERENCES project_revisions(id) ON DELETE SET NULL"
    ))
    # Backfill pq_items with Rev 0 revision_id
    _conn.execute(text("""
        UPDATE pq_items pi
        SET revision_id = (
            SELECT r.id FROM project_revisions r
            WHERE r.project_id = pi.project_id AND r.numero = 0
            LIMIT 1
        )
        WHERE pi.revision_id IS NULL
    """))
    # Add revision_id to proposals
    _conn.execute(text(
        "ALTER TABLE proposals ADD COLUMN IF NOT EXISTS revision_id INTEGER REFERENCES project_revisions(id) ON DELETE SET NULL"
    ))
    # Backfill proposals with Rev 0 revision_id
    _conn.execute(text("""
        UPDATE proposals pr
        SET revision_id = (
            SELECT r.id FROM project_revisions r
            WHERE r.project_id = pr.project_id AND r.numero = 0
            LIMIT 1
        )
        WHERE pr.revision_id IS NULL
    """))
    # Add scope capture columns to proposal_items
    _conn.execute(text(
        "ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS descricao_proposta VARCHAR(500)"
    ))
    _conn.execute(text(
        "ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS unidade_proposta VARCHAR(20)"
    ))
    _conn.execute(text(
        "ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS quantidade_proposta NUMERIC(18,4)"
    ))
    # Add extensao_km to projects (km de extensão para cálculo de custo/km no Baseline)
    _conn.execute(text(
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS extensao_km NUMERIC(10,3)"
    ))
    # Tabela de tokens de ativação (Hotmart)
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS activation_tokens (
            id         SERIAL PRIMARY KEY,
            token      VARCHAR(64) UNIQUE NOT NULL,
            email      VARCHAR(200) NOT NULL,
            expires_at TIMESTAMP NOT NULL
        )
    """))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_activation_tokens_token ON activation_tokens (token)"
    ))
    _conn.commit()

app = FastAPI(
    title="Software de Equalização",
    description="API para equalização de propostas comerciais de grandes obras de infraestrutura",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — inclui o frontend em produção via variável de ambiente
_origins = list({
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://equalizador-pq.vercel.app",
    settings.FRONTEND_URL,
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projetos"])
app.include_router(pq.router, prefix="/api/pq", tags=["Planilha PQ"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["Propostas"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Análises"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administração"])
app.include_router(monitoring.router, prefix="/api/admin/monitoring", tags=["Monitoramento"])
app.include_router(activity.router, prefix="/api", tags=["Atividade"])
app.include_router(revisions.router, prefix="/api", tags=["Revisões"])
app.include_router(hotmart.router, prefix="/api", tags=["Hotmart"])


@app.get("/api/health", tags=["Sistema"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}
