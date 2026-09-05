"""Code execution API routes with proper judging"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.exercise import Exercise
from app.models.progress import Submission
from app.schemas.schemas import CodeRunRequest, CodeRunResponse, SubmitRequest, SubmitResponse
from app.services.sandbox import run_rust_code, run_test_code, check_passed
from app.api.auth import get_user_id_from_header

router = APIRouter(prefix="/api", tags=["code"])


@router.post("/run", response_model=CodeRunResponse)
async def run_code(body: CodeRunRequest):
    """Run arbitrary Rust code in sandbox."""
    result = await run_rust_code(body.code, body.edition)
    return CodeRunResponse(**result)


@router.post("/submit", response_model=SubmitResponse)
async def submit_exercise(
    body: SubmitRequest,
    authorization: Optional[str] = Header(None),
    user_id: str = "local",
    db: Session = Depends(get_db),
):
    """Submit exercise code — runs against test cases with proper judging."""
    # Prefer auth header over query param
    uid = get_user_id_from_header(authorization or "") if authorization else user_id
    ex = db.query(Exercise).filter(Exercise.id == body.exercise_id).first()
    if not ex:
        return SubmitResponse(passed=False, stdout="", stderr="练习不存在", submission_id=0)

    # Execute based on exercise type
    if ex.type == "test":
        # Test type: wrap user code as lib + append test functions
        test_code = f"{body.code}\n\n{ex.test_code}"
        result = await run_test_code(test_code)
    else:
        result = await run_rust_code(body.code)

    # Judge with type-specific logic
    passed, feedback = check_passed(
        exercise_type=ex.type,
        result=result,
        expected_output=ex.solution_code if ex.type == "output" else "",
    )
    # Inject code for fill-type placeholder check
    result["_code"] = body.code

    # For output type, do the actual check with the solution as expected output
    if ex.type == "output" and ex.solution_code:
        actual = result["stdout"].strip()
        expected = ex.solution_code.strip()
        passed = actual == expected and result["exit_code"] == 0
        if passed:
            feedback = "✅ 输出正确！"
        elif result["exit_code"] != 0:
            feedback = "❌ 编译失败"
        else:
            feedback = f"❌ 输出不正确\n期望:\n{expected}\n\n实际:\n{actual}"

    # Save submission
    submission = Submission(
        user_id=uid,
        exercise_id=body.exercise_id,
        code=body.code,
        stdout=result["stdout"],
        stderr=feedback,  # Store feedback in stderr field
        passed=passed,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return SubmitResponse(
        passed=passed,
        stdout=result["stdout"],
        stderr=feedback,
        submission_id=submission.id,
    )
