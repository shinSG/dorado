# 🦀 Dorado — Rust 学习平台

交互式 Rust 学习平台，支持章节式课程、在线代码执行、自动评测。

## 功能特性

- **18 章递进式课程** — 从 Hello Rust 到并发编程，覆盖 Rust 核心概念
- **在线代码执行** — Docker 沙箱隔离运行，安全可靠
- **多种题型** — 自由编写 / 代码修复 / 填空 / 输出预测 / 测试用例
- **自动评测** — 提交即判，中文错误提示
- **用户系统** — 注册 / 登录 / 学习进度跟踪
- **容器预热池** — 预编译依赖，加速代码执行

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS + Monaco Editor |
| 后端 | FastAPI + SQLAlchemy + SQLite |
| 沙箱 | Docker (rust:1.90-slim)，网络隔离，资源限制 |

## 快速开始

### 前置要求

- Python 3.11+
- Node.js 18+ / pnpm
- Docker

### 一键启动

```bash
bash start.sh
```

访问 http://localhost:5174

### 手动启动

```bash
# 1. 构建沙箱镜像
docker build -t dorado-sandbox:latest docker/sandbox

# 2. 启动后端
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8500 --reload

# 3. 启动前端
cd frontend
pnpm install
pnpm dev --port 5174
```

### Docker Compose

```bash
docker compose up --build
```

## 项目结构

```
dorado/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/             # API 路由 (chapters, code, auth, env)
│   │   ├── core/            # 配置 + 数据库
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # 沙箱执行 + 内容加载
│   ├── scripts/seed.py      # 种子数据 (章节 + 练习)
│   └── requirements.txt
├── frontend/                # React 前端
│   └── src/
│       ├── pages/           # 首页 / 章节 / 登录 / 环境部署
│       ├── components/      # Monaco 编辑器 / 输出面板
│       └── api.ts           # API 客户端
├── content/chapters/        # 18 章 Markdown 课程内容
├── docker/sandbox/          # 沙箱 Dockerfile
├── docker-compose.yml
└── start.sh                 # 一键启动脚本
```

## 课程大纲

### Stage 1: 语法基础 (Ch1-15)

| # | 章节 | 主题 |
|---|------|------|
| 1 | Hello Rust | 工具链安装，cargo，println! |
| 2 | 变量与类型 | let/mut，基本类型，类型推导 |
| 3 | 函数与控制流 | fn，if/match，loop/for/while |
| 4 | 所有权系统 | move/clone/copy，栈与堆 |
| 5 | 引用与借用 | &T/&mut T，借用规则，生命周期 |
| 6 | 结构体 | struct，impl 方法，关联函数 |
| 7 | 枚举与模式匹配 | enum，Option，match，if let |
| 8 | 错误处理 | Result，? 操作符，自定义错误 |
| 9 | 集合类型 | Vec，String，HashMap |
| 10 | 泛型 | 泛型函数/结构体，单态化 |
| 11 | Trait | 定义/实现 trait，trait bound |
| 12 | 闭包与迭代器 | Fn/FnMut/FnOnce，map/filter/fold |
| 13 | 模块系统 | mod/use/pub，crate 组织 |
| 14 | Cargo 生态 | 依赖管理，feature，workspace |
| 15 | 阶段项目 | CLI 词频统计工具 |

### Stage 2: 系统编程 (Ch16-18)

| # | 章节 | 主题 |
|---|------|------|
| 16 | 智能指针 | Box，Rc，Arc，Deref/Drop |
| 17 | 内部可变性 | Cell，RefCell，Mutex，RwLock |
| 18 | 并发基础 | thread::spawn，channel，Send/Sync |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DORADO_HOST` | `0.0.0.0` | 后端绑定地址 |
| `DORADO_PORT` | `8500` | 后端端口 |
| `DORADO_SANDBOX_IMAGE` | `dorado-sandbox:latest` | 沙箱镜像名 |
| `DORADO_SANDBOX_TIMEOUT` | `10` | 代码执行超时 (秒) |
| `DORADO_SANDBOX_MEMORY` | `256m` | 容器内存限制 |
| `DORADO_SANDBOX_POOL_SIZE` | `3` | 预热容器数量 |

## API 端点

```
GET    /api/chapters              # 章节列表
GET    /api/chapters/{slug}       # 章节详情 + 练习
POST   /api/run                   # 运行代码
POST   /api/submit                # 提交练习
POST   /api/auth/register         # 注册
POST   /api/auth/login            # 登录
GET    /api/env/detect            # 环境检测
GET    /api/stats                 # 平台统计
```

完整文档: http://localhost:8500/docs

## License

MIT
