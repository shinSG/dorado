"""Content service — load chapters and exercises from markdown files"""
import os
from pathlib import Path
from app.core.config import CONTENT_DIR


def load_chapter_content(content_file: str) -> str:
    """Load markdown content from content directory."""
    path = CONTENT_DIR / content_file
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"# 内容加载失败\n\n找不到文件: {content_file}"


def list_content_files() -> list[str]:
    """List all .md files in content directory recursively."""
    files = []
    chapters_dir = CONTENT_DIR / "chapters"
    if chapters_dir.exists():
        for f in sorted(chapters_dir.rglob("*.md")):
            files.append(str(f.relative_to(CONTENT_DIR)))
    return files
