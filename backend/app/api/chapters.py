"""Chapter & Exercise API routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chapter import Chapter
from app.models.exercise import Exercise
from app.models.progress import Progress, Submission
from app.schemas.schemas import (
    ChapterBrief, ChapterDetail, ExerciseBrief, ExerciseDetail,
    ProgressUpdate
)
from app.services.content import load_chapter_content

router = APIRouter(prefix="/api", tags=["chapters"])


@router.get("/chapters", response_model=list[ChapterBrief])
def list_chapters(user_id: str = "local", db: Session = Depends(get_db)):
    """List all chapters with user progress status."""
    chapters = db.query(Chapter).order_by(Chapter.stage, Chapter.order).all()

    # Get user progress
    progress_map = {}
    if user_id:
        for p in db.query(Progress).filter(Progress.user_id == user_id).all():
            progress_map[p.chapter_id] = p.status

    result = []
    for ch in chapters:
        brief = ChapterBrief.model_validate(ch)
        brief.progress_status = progress_map.get(ch.id, "locked" if ch.unlock_after else "unlocked")
        result.append(brief)
    return result


@router.get("/chapters/{slug}", response_model=ChapterDetail)
def get_chapter(slug: str, user_id: str = "local", db: Session = Depends(get_db)):
    """Get chapter detail with content and exercises."""
    ch = db.query(Chapter).filter(Chapter.slug == slug).first()
    if not ch:
        raise HTTPException(404, "Chapter not found")

    content = load_chapter_content(ch.content_file)

    # Get progress
    progress = db.query(Progress).filter(
        Progress.user_id == user_id, Progress.chapter_id == ch.id
    ).first()

    # Get exercises with submission status
    exercises = []
    for ex in db.query(Exercise).filter(Exercise.chapter_id == ch.id).order_by(Exercise.order).all():
        passed = db.query(Submission).filter(
            Submission.user_id == user_id,
            Submission.exercise_id == ex.id,
            Submission.passed == True
        ).first() is not None
        brief = ExerciseBrief.model_validate(ex)
        brief.passed = passed
        exercises.append(brief)

    detail = ChapterDetail(
        id=ch.id,
        stage=ch.stage,
        order=ch.order,
        slug=ch.slug,
        title=ch.title,
        subtitle=ch.subtitle,
        unlock_after=ch.unlock_after,
        progress_status=progress.status if progress else ("locked" if ch.unlock_after else "unlocked"),
        content=content,
        exercises=exercises,
    )
    return detail


@router.get("/exercises/{exercise_id}", response_model=ExerciseDetail)
def get_exercise(exercise_id: int, user_id: str = "local", db: Session = Depends(get_db)):
    """Get exercise detail."""
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercise not found")

    passed = db.query(Submission).filter(
        Submission.user_id == user_id,
        Submission.exercise_id == ex.id,
        Submission.passed == True
    ).first() is not None

    detail = ExerciseDetail.model_validate(ex)
    detail.passed = passed
    # Only show solution after passing
    if not passed:
        detail.solution_code = ""
    return detail


@router.post("/progress")
def update_progress(body: ProgressUpdate, user_id: str = "local", db: Session = Depends(get_db)):
    """Update user progress for a chapter."""
    from datetime import datetime
    progress = db.query(Progress).filter(
        Progress.user_id == user_id, Progress.chapter_id == body.chapter_id
    ).first()

    if progress:
        progress.status = body.status
        if body.status == "completed":
            progress.completed_at = datetime.utcnow()
    else:
        progress = Progress(
            user_id=user_id,
            chapter_id=body.chapter_id,
            status=body.status,
            completed_at=datetime.utcnow() if body.status == "completed" else None,
        )
        db.add(progress)

    db.commit()
    return {"ok": True}


@router.get("/progress")
def get_progress(user_id: str = "local", db: Session = Depends(get_db)):
    """Get all progress for a user."""
    items = db.query(Progress).filter(Progress.user_id == user_id).all()
    return [
        {"chapter_id": p.chapter_id, "status": p.status, "completed_at": str(p.completed_at) if p.completed_at else None}
        for p in items
    ]
