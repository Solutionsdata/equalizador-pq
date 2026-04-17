from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class ProjectRevision(Base):
    __tablename__ = "project_revisions"
    __table_args__ = (UniqueConstraint("project_id", "numero", name="uq_revision_project_numero"),)

    id         = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    numero     = Column(Integer, nullable=False, default=0)
    descricao  = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="revisions")
