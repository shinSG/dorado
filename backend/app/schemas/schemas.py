"""Pydantic schemas for API request/response"""
from datetime import datetime
from pydantic import BaseModel


# --- Chapter ---
class ChapterBrief(BaseModel):
    id: int
    stage: int
    order: int
    slug: str
    title: str
    subtitle: str
    unlock_after: str | None
    progress_status: str = "locked"  # injected from progress lookup

    class Config:
        from_attributes = True


class ChapterDetail(ChapterBrief):
    content: str  # markdown content loaded from file
    exercises: list["ExerciseBrief"] = []


# --- Exercise ---
class ExerciseBrief(BaseModel):
    id: int
    order: int
    type: str
    title: str
    description: str
    template_code: str
    hint: str
    passed: bool = False  # from submission history

    class Config:
        from_attributes = True


class ExerciseDetail(ExerciseBrief):
    solution_code: str = ""  # only shown after passing
    test_code: str = ""


# --- Code Execution ---
class CodeRunRequest(BaseModel):
    code: str
    edition: str = "2021"


class CodeRunResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool = False


# --- Exercise Submission ---
class SubmitRequest(BaseModel):
    exercise_id: int
    code: str = ""
    answer: str | None = None


class SubmitResponse(BaseModel):
    passed: bool
    stdout: str
    stderr: str
    submission_id: int


# --- Progress ---
class ProgressUpdate(BaseModel):
    chapter_id: int
    status: str  # in_progress / completed


# --- Env Detection ---
class EnvDetectResponse(BaseModel):
    os: str | None = None
    arch: str | None = None
    rustup: str | None = None
    rustc: str | None = None
    cargo: str | None = None
    toolchains: str | None = None
    components: str | None = None
    cargo_watch: bool = False
    cargo_nextest: bool = False
    lld_available: bool = False
    cc: bool = False
    cmake: bool = False
    pkg_config: bool = False
    overall_status: str = "unknown"  # ready / partial / missing
