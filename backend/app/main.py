"""Dorado — Rust Learning Platform"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.api import chapters, code, env, auth

app = FastAPI(title="Dorado", version="0.2.0", description="Rust 学习平台")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chapters.router)
app.include_router(code.router)
app.include_router(env.router)
app.include_router(auth.router)


@app.on_event("startup")
async def startup():
    init_db()
    # Auto-seed if DB is empty
    from app.models.chapter import Chapter
    from app.core.database import SessionLocal
    db = SessionLocal()
    if db.query(Chapter).count() == 0:
        from scripts.seed import seed_all
        seed_all(db)
    db.close()
    # Warm up container pool
    from app.services.sandbox import init_pool
    await init_pool()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "dorado", "version": "0.2.0"}


@app.get("/api/stats")
def stats():
    """Platform-wide statistics."""
    from app.core.database import SessionLocal
    from app.models.chapter import Chapter
    from app.models.exercise import Exercise
    from app.models.progress import Submission
    db = SessionLocal()
    try:
        return {
            "chapters": db.query(Chapter).count(),
            "exercises": db.query(Exercise).count(),
            "submissions": db.query(Submission).count(),
            "pass_rate": round(
                db.query(Submission).filter(Submission.passed == True).count() /
                max(db.query(Submission).count(), 1) * 100, 1
            ),
        }
    finally:
        db.close()
