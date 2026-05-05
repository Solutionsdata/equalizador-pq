from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Neon (e alguns provedores) retorna "postgres://" mas SQLAlchemy 2.x exige "postgresql://"
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    pool_recycle=60,        # recicla conexões ociosas a cada 60s (Neon pausa antes disso)
    pool_size=3,
    max_overflow=2,
    pool_timeout=25,        # falha rápido se não conseguir conexão (Render timeout = 30s)
    connect_args={"connect_timeout": 10},  # timeout de abertura TCP com o banco
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
