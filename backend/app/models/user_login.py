from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from app.database import Base


class UserLogin(Base):
    __tablename__ = "user_logins"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow, index=True)
    ip        = Column(String(50), nullable=True)
