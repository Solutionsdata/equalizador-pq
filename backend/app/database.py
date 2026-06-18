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
    pool_recycle=300,       # recicla conexões a cada 5 min (Neon fecha idle após ~5 min)
    pool_size=10,           # suporta 10 usuários simultâneos sem espera
    max_overflow=5,         # até 15 conexões em picos
    pool_timeout=20,
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
