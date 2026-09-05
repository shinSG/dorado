"""Environment detection API routes"""
import asyncio
import platform
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from app.schemas.schemas import EnvDetectResponse
from app.services.sandbox import get_install_script

router = APIRouter(prefix="/api/env", tags=["environment"])


DETECT_SCRIPT = r'''
echo "{"
echo '"os": "'$(uname -s)'",'
echo '"arch": "'$(uname -m)'",'

if command -v rustup &>/dev/null; then
  echo '"rustup": "'$(rustup --version 2>/dev/null | head -1)'",'
  echo '"rustc": "'$(rustc --version 2>/dev/null)'",'
  echo '"cargo": "'$(cargo --version 2>/dev/null)'",'
  echo '"toolchains": "'$(rustup toolchain list 2>/dev/null | tr '\n' '; ' )'",'
  echo '"components": "'$(rustup component list --installed 2>/dev/null | tr '\n' '; ')'",'
else
  echo '"rustup": null,'
  echo '"rustc": null,'
  echo '"cargo": null,'
  echo '"toolchains": null,'
  echo '"components": null,'
fi

echo '"cargo_watch": '$(command -v cargo-watch &>/dev/null && echo true || echo false)','
echo '"cargo_nextest": '$(command -v cargo-nextest &>/dev/null && echo true || echo false)','
echo '"lld_available": '$(command -v lld &>/dev/null && echo true || echo false)','
echo '"cc": '$(command -v cc &>/dev/null && echo true || echo false)','
echo '"cmake": '$(command -v cmake &>/dev/null && echo true || echo false)','
echo '"pkg_config": '$(command -v pkg-config &>/dev/null && echo true || echo false)
echo "}"
'''


@router.get("/detect", response_model=EnvDetectResponse)
async def detect_env():
    """Run environment detection on the server."""
    try:
        proc = await asyncio.create_subprocess_shell(
            DETECT_SCRIPT,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        import json
        data = json.loads(stdout.decode())

        # Determine overall status
        if data.get("rustc") and data.get("cargo"):
            data["overall_status"] = "ready"
        elif data.get("rustup"):
            data["overall_status"] = "partial"
        else:
            data["overall_status"] = "missing"

        return EnvDetectResponse(**data)
    except Exception:
        return EnvDetectResponse(overall_status="error")


@router.get("/install-script/{os_type}")
async def get_script(os_type: str):
    """Get one-click install script."""
    script = get_install_script(os_type)
    return PlainTextResponse(script, media_type="text/plain")


@router.get("/install-script/{os_type}/download")
async def download_script(os_type: str):
    """Download install script as file."""
    script = get_install_script(os_type)
    return PlainTextResponse(
        script,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=dorado-setup-{os_type}.sh"},
    )
