"""Exercise model"""
from datetime import datetime
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chapter_id: Mapped[int] = mapped_column(Integer, ForeignKey("chapters.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # fill, fix, output, test, free
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    template_code: Mapped[str] = mapped_column(Text, nullable=False)  # initial code shown to user
    solution_code: Mapped[str] = mapped_column(Text, default="")  # reference solution
    test_code: Mapped[str] = mapped_column(Text, default="")  # test assertions appended
    hint: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    chapter: Mapped["Chapter"] = relationship(back_populates="exercises")

    def __repr__(self):
        return f"<Exercise {self.id}: {self.title} ({self.type})>"
