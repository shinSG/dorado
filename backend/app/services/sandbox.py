"""Sandbox service — Docker-based code execution with container pool"""
import asyncio
import tempfile
import os
import shutil
import json
import re
from collections import deque
from dataclasses import dataclass, field

from app.core.config import SANDBOX_IMAGE, SANDBOX_TIMEOUT, SANDBOX_MEMORY, SANDBOX_CPU, SANDBOX_POOL_SIZE


# ─── Common crate manifest ───────────────────────────────────────
COMMON_CARGO_TOML = '''[package]
name = "sandbox"
version = "0.1.0"
edition = "{edition}"

[dependencies]
serde = {{ version = "1", features = ["derive"] }}
serde_json = "1"
tokio = {{ version = "1", features = ["full"] }}
'''

TEST_CARGO_TOML = '''[package]
name = "sandbox-test"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = {{ version = "1", features = ["derive"] }}
serde_json = "1"
'''


# ─── Container Pool ──────────────────────────────────────────────
@dataclass
class ContainerPool:
    """Pre-warmed Docker container pool for faster execution."""
    _available: deque = field(default_factory=deque)
    _size: int = 0
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _max_size: int = SANDBOX_POOL_SIZE

    async def get_container(self) -> str:
        """Get a pre-warmed container ID, or create a new one."""
        async with self._lock:
            while self._available:
                cid = self._available.popleft()
                # Verify container is still running
                proc = await asyncio.create_subprocess_exec(
                    "docker", "inspect", "-f", "{{.State.Running}}", cid,
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout.decode().strip() == "true":
                    return cid
            # No pre-warmed container available, will create inline
            return ""

    async def release_container(self, cid: str):
        """Return a container to the pool or remove it."""
        async with self._lock:
            if len(self._available) < self._max_size:
                self._available.append(cid)
            else:
                await self._remove_container(cid)

    async def warm_up(self):
        """Pre-warm containers with compiled dependencies."""
        for _ in range(self._max_size):
            cid = await self._create_warm_container()
            if cid:
                self._available.append(cid)

    async def _create_warm_container(self) -> str:
        """Create a container with pre-compiled dependencies."""
        try:
            # Create temp project
            tmpdir = tempfile.mkdtemp(prefix="dorado_warm_")
            src_dir = os.path.join(tmpdir, "src")
            os.makedirs(src_dir)
            with open(os.path.join(src_dir, "main.rs"), "w") as f:
                f.write('fn main() { println!("warm"); }')
            with open(os.path.join(tmpdir, "Cargo.toml"), "w") as f:
                f.write(COMMON_CARGO_TOML.format(edition="2021"))

            # Start container that stays running
            proc = await asyncio.create_subprocess_exec(
                "docker", "run", "-d",
                "--network=none",
                f"--memory={SANDBOX_MEMORY}",
                f"--cpus={SANDBOX_CPU}",
                "-v", f"{tmpdir}:/input:ro",
                "-w", "/tmp",
                SANDBOX_IMAGE,
                "bash", "-c",
                "cp -r /input/src . && cp /input/Cargo.toml . && "
                "cargo build --release 2>/dev/null && sleep infinity",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            cid = stdout.decode().strip()
            if cid:
                self._size += 1
                return cid
        except Exception:
            pass
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)
        return ""

    @staticmethod
    async def _remove_container(cid: str):
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "rm", "-f", cid,
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
            )
            await proc.wait()
        except Exception:
            pass


# Global pool instance
_pool = ContainerPool()


async def init_pool():
    """Initialize the container pool on startup."""
    try:
        await _pool.warm_up()
        print(f"✅ Container pool warmed up ({_pool._size} containers)")
    except Exception as e:
        print(f"⚠️ Container pool warm-up failed: {e}")


# ─── Code Execution ──────────────────────────────────────────────
async def _sandbox_unavailable_result() -> dict | None:
    """Return a clear infrastructure error when the runner image is missing."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "image", "inspect", SANDBOX_IMAGE,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=5)
        if proc.returncode == 0:
            return None
        detail = stderr.decode(errors="replace").strip()
    except (FileNotFoundError, asyncio.TimeoutError):
        detail = "Docker 服务不可用"

    return {
        "stdout": "",
        "stderr": f"运行环境未就绪：未找到沙箱镜像 {SANDBOX_IMAGE}。{detail}",
        "exit_code": -2,
        "timed_out": False,
    }


async def run_rust_code(code: str, edition: str = "2021") -> dict:
    """Execute Rust code in a Docker sandbox."""
    unavailable = await _sandbox_unavailable_result()
    if unavailable:
        return unavailable
    tmpdir = tempfile.mkdtemp(prefix="dorado_")
    try:
        src_dir = os.path.join(tmpdir, "src")
        os.makedirs(src_dir)
        with open(os.path.join(src_dir, "main.rs"), "w") as f:
            f.write(code)
        with open(os.path.join(tmpdir, "Cargo.toml"), "w") as f:
            f.write(COMMON_CARGO_TOML.format(edition=edition))

        cmd = _build_docker_cmd(tmpdir, "cargo run --release --offline 2>&1")
        return await _exec_in_docker(cmd)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


async def run_test_code(code: str) -> dict:
    """Run code with cargo test."""
    unavailable = await _sandbox_unavailable_result()
    if unavailable:
        return unavailable
    tmpdir = tempfile.mkdtemp(prefix="dorado_test_")
    try:
        src_dir = os.path.join(tmpdir, "src")
        os.makedirs(src_dir)
        with open(os.path.join(src_dir, "lib.rs"), "w") as f:
            f.write(code)
        with open(os.path.join(tmpdir, "Cargo.toml"), "w") as f:
            f.write(TEST_CARGO_TOML)

        cmd = _build_docker_cmd(tmpdir, "cargo test --offline 2>&1")
        return await _exec_in_docker(cmd)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _build_docker_cmd(tmpdir: str, run_cmd: str) -> list[str]:
    return [
        "docker", "run", "--rm", "--pull=never",
        "--network=none",
        f"--memory={SANDBOX_MEMORY}",
        f"--cpus={SANDBOX_CPU}",
        "-v", f"{tmpdir}:/input:ro",
        "-w", "/tmp",
        SANDBOX_IMAGE,
        "bash", "-c",
        f"cp -r /input/src . && cp /input/Cargo.toml . && timeout {SANDBOX_TIMEOUT} {run_cmd}",
    ]


async def _exec_in_docker(cmd: list[str]) -> dict:
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=SANDBOX_TIMEOUT + 5
        )
        raw_stdout = stdout.decode(errors="replace")
        raw_stderr = stderr.decode(errors="replace")
        if proc.returncode == 124:
            return {
                "stdout": raw_stdout,
                "stderr": f"执行超时（{SANDBOX_TIMEOUT}秒）",
                "exit_code": 124,
                "timed_out": True,
            }
        # Docker captures both stdout and stderr in stdout with 2>&1,
        # but stderr may still have container-level errors
        return {
            "stdout": raw_stdout,
            "stderr": raw_stderr,
            "exit_code": proc.returncode or 0,
            "timed_out": False,
        }
    except asyncio.TimeoutError:
        proc.kill()
        return {
            "stdout": "",
            "stderr": f"执行超时（{SANDBOX_TIMEOUT}秒）",
            "exit_code": -1,
            "timed_out": True,
        }


# ─── Judging Logic ───────────────────────────────────────────────
def check_passed(exercise_type: str, result: dict, expected_output: str = "") -> tuple[bool, str]:
    """
    Check if submission passes based on exercise type.
    Returns (passed, feedback_message).
    """
    if result["timed_out"]:
        return False, "⏱ 执行超时，请检查是否有死循环"

    if exercise_type == "free":
        # Free exercise: just needs to compile and run
        passed = result["exit_code"] == 0
        if passed:
            return True, "✅ 运行成功！"
        return False, "❌ 编译或运行失败，请检查错误信息"

    elif exercise_type == "fill":
        # Fill exercise: must compile and run, check for placeholder removal
        if result["exit_code"] != 0:
            return False, "❌ 编译失败，请检查填入的类型是否正确"
        # Check if placeholders still exist
        if "/* 填入类型 */" in result.get("_code", "") or "/* fill */" in result.get("_code", ""):
            return False, "⚠️ 还有未填写的占位符"
        return True, "✅ 填写正确！"

    elif exercise_type == "fix":
        # Fix exercise: must compile and run without errors
        if result["exit_code"] == 0:
            return True, "✅ 修复成功！代码正常运行"
        # Parse error for helpful hint
        error_hint = _parse_rust_error(result["stdout"] + result["stderr"])
        return False, f"❌ 还有错误：{error_hint}"

    elif exercise_type == "output":
        # Output exercise: compare stdout with expected
        if result["exit_code"] != 0:
            return False, "❌ 编译失败"
        actual = result["stdout"].strip()
        expected = expected_output.strip()
        if actual == expected:
            return True, "✅ 输出正确！"
        return False, f"❌ 输出不正确\n期望: {expected}\n实际: {actual}"

    elif exercise_type == "test":
        # Test exercise: cargo test must pass
        if "test result: ok" in result["stdout"] or result["exit_code"] == 0:
            return True, "✅ 所有测试通过！"
        # Extract test failure details
        fail_lines = [l for l in result["stdout"].split("\n") if "FAILED" in l or "panicked" in l]
        detail = "\n".join(fail_lines[:3]) if fail_lines else "测试未通过"
        return False, f"❌ 测试失败：{detail}"

    # Default: pass if exit code 0
    return result["exit_code"] == 0, "✅ 通过" if result["exit_code"] == 0 else "❌ 失败"


# ─── Rust Error Parser ───────────────────────────────────────────
_RUST_ERROR_PATTERNS = [
    (r"cannot assign twice to immutable variable `(.+?)`",
     "变量 `{0}` 是不可变的，需要在 `let` 后加 `mut`：`let mut {0} = ...`"),
    (r"cannot borrow `(.+?)` as mutable more than once",
     "同一作用域不能有多个可变引用 `{0}`，用花括号分隔作用域或减少可变引用"),
    (r"cannot borrow `(.+?)` as immutable because it is also borrowed as mutable",
     "`{0}` 已有可变引用，不能同时创建不可变引用"),
    (r"move occurs because `(.+?)` has type `(.+?)`",
     "`{0}` 的类型 `{1}` 没有实现 Copy trait，赋值会发生所有权转移。试试 `.clone()`"),
    (r"expected .+?, found .+?",
     "类型不匹配，检查变量类型或使用 `as` 显式转换"),
    (r"not found in this scope",
     "变量或函数未找到，检查拼写和是否导入"),
    (r"mismatched types",
     "类型不匹配，Rust 不会隐式转换类型"),
    (r"expected `;`",
     "缺少分号 `;`"),
    (r"unexpected token",
     "语法错误，检查括号和标点符号"),
]


def _parse_rust_error(output: str) -> str:
    """Parse rustc error output and return a Chinese hint."""
    for pattern, hint in _RUST_ERROR_PATTERNS:
        match = re.search(pattern, output)
        if match:
            try:
                return hint.format(*match.groups())
            except (IndexError, KeyError):
                return hint
    # Return first error line as fallback
    for line in output.split("\n"):
        if "error[" in line or line.strip().startswith("error"):
            return line.strip()[:200]
    return "请检查代码中的错误"


# ─── Install Scripts (unchanged) ─────────────────────────────────
def get_install_script(os_type: str = "linux") -> str:
    if os_type == "darwin":
        return DARWIN_SCRIPT
    elif os_type in ("linux", "ubuntu", "debian"):
        return LINUX_DEBIAN_SCRIPT
    elif os_type in ("rhel", "centos", "fedora"):
        return LINUX_RHEL_SCRIPT
    else:
        return LINUX_DEBIAN_SCRIPT


LINUX_DEBIAN_SCRIPT = r'''#!/bin/bash
set -e
echo "🦀 Dorado - Rust 学习平台 环境部署"
echo "==================================="

echo "[1/5] 安装系统依赖..."
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev cmake

if ! command -v rustup &>/dev/null; then
    echo "[2/5] 安装 rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "[2/5] rustup 已安装，跳过"
fi

echo "[3/5] 配置 toolchain..."
rustup default stable
rustup toolchain install nightly --profile minimal
rustup component add rust-src rust-analyzer clippy rustfmt

echo "[4/5] 安装 cargo 工具..."
cargo install cargo-watch cargo-nextest cargo-edit 2>/dev/null || true

echo "[5/5] 验证安装..."
echo ""
rustc --version
cargo --version
rustup show
echo ""
echo "🎉 环境部署完成！回到 Dorado 平台开始学习 →"
'''

LINUX_RHEL_SCRIPT = r'''#!/bin/bash
set -e
echo "🦀 Dorado - Rust 学习平台 环境部署"
echo "==================================="

echo "[1/5] 安装系统依赖..."
sudo yum groupinstall -y "Development Tools"
sudo yum install -y openssl-devel cmake pkg-config

if ! command -v rustup &>/dev/null; then
    echo "[2/5] 安装 rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "[2/5] rustup 已安装，跳过"
fi

echo "[3/5] 配置 toolchain..."
rustup default stable
rustup toolchain install nightly --profile minimal
rustup component add rust-src rust-analyzer clippy rustfmt

echo "[4/5] 安装 cargo 工具..."
cargo install cargo-watch cargo-nextest cargo-edit 2>/dev/null || true

echo "[5/5] 验证安装..."
echo ""
rustc --version
cargo --version
rustup show
echo ""
echo "🎉 环境部署完成！回到 Dorado 平台开始学习 →"
'''

DARWIN_SCRIPT = r'''#!/bin/bash
set -e
echo "🦀 Dorado - Rust 学习平台 环境部署"
echo "==================================="

echo "[1/5] 安装 Xcode Command Line Tools..."
xcode-select --install 2>/dev/null || echo "已安装，跳过"

if ! command -v rustup &>/dev/null; then
    echo "[2/5] 安装 rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "[2/5] rustup 已安装，跳过"
fi

echo "[3/5] 配置 toolchain..."
rustup default stable
rustup toolchain install nightly --profile minimal
rustup component add rust-src rust-analyzer clippy rustfmt

echo "[4/5] 安装 cargo 工具..."
cargo install cargo-watch cargo-nextest cargo-edit 2>/dev/null || true

echo "[5/5] 验证安装..."
echo ""
rustc --version
cargo --version
rustup show
echo ""
echo "🎉 环境部署完成！回到 Dorado 平台开始学习 →"
'''
