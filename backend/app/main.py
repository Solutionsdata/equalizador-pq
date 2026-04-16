from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.config import settings
from app.routers import auth, projects, pq, proposals, analytics, admin

# Cria tabelas novas e adiciona colunas ausentes (migração simples sem Alembic)
Base.metadata.create_all(bind=engine)

with engine.connect() as _conn:
    _conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    _conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_ate TIMESTAMP"
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


@app.get("/api/health", tags=["Sistema"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}
