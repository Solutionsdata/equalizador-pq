from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.config import settings
from app.routers import auth, projects, pq, proposals, analytics, admin, revisions, sharing
from app.routers import monitoring, hotmart
from app.models import project_share  # noqa: F401 — ensure table is registered

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
    # Convert tipo_obra from Postgres enum to plain VARCHAR (allows free-text values)
    _conn.execute(text(
        "ALTER TABLE projects ALTER COLUMN tipo_obra TYPE VARCHAR(100) USING tipo_obra::text"
    ))
    # Garante ON DELETE CASCADE em proposal_items → pq_items (idempotente)
    _conn.execute(text("""
        DO $$
        DECLARE c text;
        BEGIN
            SELECT rc.constraint_name INTO c
            FROM information_schema.referential_constraints rc
            JOIN information_schema.key_column_usage kcu
                ON rc.constraint_name = kcu.constraint_name
            WHERE kcu.table_name = 'proposal_items' AND kcu.column_name = 'pq_item_id'
            LIMIT 1;
            IF c IS NOT NULL THEN
                EXECUTE 'ALTER TABLE proposal_items DROP CONSTRAINT ' || quote_ident(c);
            END IF;
            ALTER TABLE proposal_items
                ADD CONSTRAINT proposal_items_pq_item_id_fkey
                FOREIGN KEY (pq_item_id) REFERENCES pq_items(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """))
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
    # ── Tabela de logins (substitui activity_logs volumoso) ──────────────────
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_logins (
            id        SERIAL PRIMARY KEY,
            user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
            logged_at TIMESTAMP NOT NULL DEFAULT NOW(),
            ip        VARCHAR(50)
        )
    """))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_user_logins_logged_at ON user_logins (logged_at)"
    ))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_user_logins_user_id ON user_logins (user_id)"
    ))
    # Limpa activity_logs antigos para liberar espaço no banco
    _conn.execute(text("TRUNCATE TABLE activity_logs"))
    # ── Índices de performance nas tabelas mais pesadas ───────────────────────
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_pq_items_project_revision ON pq_items (project_id, revision_id)"
    ))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_proposal_items_proposal_id ON proposal_items (proposal_id)"
    ))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_proposal_items_pq_item_id ON proposal_items (pq_item_id)"
    ))
    # Localidade na PQ
    _conn.execute(text(
        "ALTER TABLE pq_items ADD COLUMN IF NOT EXISTS localidade VARCHAR(200)"
    ))
    # Colunas COM REIDI nas propostas
    _conn.execute(text(
        "ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS custo_unit_com_reidi NUMERIC(18,4)"
    ))
    _conn.execute(text(
        "ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS bdi_com_reidi NUMERIC(5,2)"
    ))
    _conn.execute(text(
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS spe_unidade VARCHAR(100)"
    ))
    # Migrar projetos RASCUNHO para EM_ANDAMENTO (status removido da UI)
    _conn.execute(text(
        "UPDATE projects SET status = 'EM_ANDAMENTO' WHERE status = 'RASCUNHO'"
    ))
    # ── Compartilhamento de projetos entre usuários ───────────────────────────
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS project_shares (
            id           SERIAL PRIMARY KEY,
            project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            shared_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_project_share UNIQUE (project_id, user_id)
        )
    """))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_project_shares_project_id ON project_shares (project_id)"
    ))
    _conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_project_shares_user_id ON project_shares (user_id)"
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
app.include_router(revisions.router, prefix="/api", tags=["Revisões"])
app.include_router(sharing.router, prefix="/api", tags=["Compartilhamento"])
app.include_router(hotmart.router, prefix="/api", tags=["Hotmart"])


@app.get("/api/health", tags=["Sistema"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}
