"""Dorado - Rust Learning Platform Configuration"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONTENT_DIR = BASE_DIR.parent / "content"
DB_PATH = BASE_DIR / "data" / "dorado.db"

# Ensure data dir exists
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Docker sandbox
SANDBOX_IMAGE = os.getenv("DORADO_SANDBOX_IMAGE", "dorado-sandbox:latest")
SANDBOX_TIMEOUT = int(os.getenv("DORADO_SANDBOX_TIMEOUT", "10"))  # seconds
SANDBOX_MEMORY = os.getenv("DORADO_SANDBOX_MEMORY", "256m")
SANDBOX_CPU = os.getenv("DORADO_SANDBOX_CPU", "1.0")
SANDBOX_POOL_SIZE = int(os.getenv("DORADO_SANDBOX_POOL_SIZE", "3"))

# Server
HOST = os.getenv("DORADO_HOST", "0.0.0.0")
PORT = int(os.getenv("DORADO_PORT", "8500"))
