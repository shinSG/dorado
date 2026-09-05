#!/bin/bash
# start.sh — Dorado 一键启动脚本
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🦀 Dorado — Rust 学习平台"
echo "========================="

# 1. 检查沙箱镜像
if ! docker image inspect dorado-sandbox:latest &>/dev/null; then
    echo "📦 构建沙箱镜像..."
    docker build -t dorado-sandbox:latest "$SCRIPT_DIR/docker/sandbox"
fi

# 2. 启动后端
echo "🚀 启动后端 (port 8500)..."
cd "$SCRIPT_DIR/backend"
if [ ! -d ".venv" ]; then
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi
uvicorn app.main:app --host 0.0.0.0 --port 8500 --reload &
BACKEND_PID=$!

# 3. 启动前端
echo "🎨 启动前端 (port 5174)..."
cd "$SCRIPT_DIR/frontend"
pnpm dev --port 5174 &
FRONTEND_PID=$!

echo ""
echo "✅ Dorado 已启动!"
echo "   前端: http://localhost:5174"
echo "   后端: http://localhost:8500"
echo "   API:  http://localhost:8500/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待任一进程退出
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" SIGINT SIGTERM
wait
