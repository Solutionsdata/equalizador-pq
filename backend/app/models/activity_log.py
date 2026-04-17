from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    pagina    = Column(String(200), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip        = Column(String(50), nullable=True)
