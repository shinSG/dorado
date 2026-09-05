"""Chapter model"""
from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stage: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(500), default="")
    content_file: Mapped[str] = mapped_column(String(300), nullable=False)  # path to .md file
    unlock_after: Mapped[str | None] = mapped_column(String(100), nullable=True)  # slug of prerequisite
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    exercises: Mapped[list["Exercise"]] = relationship(back_populates="chapter", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Chapter {self.slug}: {self.title}>"
