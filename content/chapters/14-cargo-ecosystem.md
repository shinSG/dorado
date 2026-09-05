# 第 14 章 Cargo 生态系统

## 为什么 Cargo 如此重要？

> 🔑 Cargo 不仅仅是一个包管理器——它是 Rust 的**构建系统**、**包管理器**、**测试运行器**、**文档生成器**和**项目脚手架工具**的集合体。

在 C/C++ 世界里，你可能需要 CMake + Conan + GTest + Doxygen 才能获得类似功能。Cargo 把这一切统一到一个工具里，用一个 `Cargo.toml` 描述项目的一切。

```
┌──────────────────────────────────────────────────────┐
│                   Cargo = 一站式工具                    │
├───────────────┬──────────────┬───────────┬───────────┤
│   构建系统     │   包管理器    │  测试框架  │ 文档生成器 │
│  cargo build  │ cargo add    │ cargo test│ cargo doc │
└───────────────┴──────────────┴───────────┴───────────┘
```

---

## 创建项目

```bash
cargo new my-app           # 二进制项目，生成 src/main.rs
cargo new my-lib --lib     # 库项目，生成 src/lib.rs
cargo init                 # 在当前目录初始化（二进制）
cargo init --lib           # 在当前目录初始化（库）
```

```
二进制项目 (bin)               库项目 (lib)
my-app/                       my-lib/
├── Cargo.toml                ├── Cargo.toml
└── src/                      └── src/
    └── main.rs                   └── lib.rs
         ↓                             ↓
    fn main() {}                pub fn greet() {}
    可以 cargo run              供其他 crate use 引用
```

> 💡 一个 crate 可以同时包含 `main.rs` 和 `lib.rs`，既是可执行文件又是库。

---

## Cargo.toml 深入解析

```toml
[package]
name = "my-app"                              # 包名（crates.io 标识符）
version = "0.1.0"                            # 语义化版本号
edition = "2021"                             # Rust 版次（2015/2018/2021/2024）
authors = ["Your Name <email@example.com>"]  # 作者
description = "A short description"          # 一句话描述（发布必需）
license = "MIT"                              # 许可证（SPDX 标识符）

[dependencies]         # 运行时依赖
[dev-dependencies]     # 仅测试/bench 依赖
[build-dependencies]   # 仅 build.rs 使用的依赖
```

> ⚠️ `edition` 不是编译器版本！它是一组语言特性集合。`edition = "2021"` 使用 2021 版次语法规则，但仍用最新 Rust 编译器编译。

---

## 依赖管理与版本控制

```toml
[dependencies]
serde = "1.0"                                    # crates.io，默认 ^1.0
serde_json = "1.0.100"                           # 精确到修订版本
tokio = { version = "1", features = ["full"] }   # 启用 features
my_lib = { path = "../my_lib" }                  # 本地路径
git_dep = { git = "https://github.com/..." }     # Git 仓库
```

### 语义化版本（Semver）

```
  1 . 4 . 2
  ↑   ↑   ↑
  │   │   └── PATCH：bug 修复，向后兼容
  │   └────── MINOR：新功能，向后兼容
  └────────── MAJOR：破坏性变更
```

| 写法 | 含义 | 接受范围 |
|------|------|---------|
| `"1.2.3"` / `"^1.2.3"` | 兼容更新（默认） | `>=1.2.3, <2.0.0` |
| `"~1.2.3"` | 仅修订版本更新 | `>=1.2.3, <1.3.0` |
| `"=1.2.3"` | 精确版本 | 仅 `1.2.3` |
| `">=1.0, <1.5"` | 范围约束 | `>=1.0.0, <1.5.0` |
| `"*"` | 任意版本 | 不推荐 |

> 💡 Cargo 默认用 `^`：次版本和修订版本可自动更新，主版本不会自动升级——保证向后兼容。

### Cargo.lock

`Cargo.lock` 锁定所有依赖的**精确版本**，保证可复现构建。
- **二进制项目**：提交到 Git（部署环境一致）
- **库项目**：通常不提交（让使用者决定版本）

---

## Features 条件编译

Features 允许按需启用库的某些功能，减少不必要的编译。

```toml
[features]
default = ["json"]                  # 默认启用
json = ["serde", "serde_json"]      # 启用 json = 启用这两个依赖
xml = ["quick-xml"]
full = ["json", "xml"]              # 组合 feature

[dependencies]
serde = { version = "1.0", optional = true }         # 可选依赖
serde_json = { version = "1.0", optional = true }
quick-xml = { version = "0.31", optional = true }
reqwest = "0.12"                                      # 始终编译
```

```rust
#[cfg(feature = "json")]
pub fn parse_json(input: &str) -> serde_json::Value {
    serde_json::from_str(input).unwrap()
}

#[cfg(not(feature = "json"))]
pub fn parse_json(_input: &str) -> ! {
    panic!("请启用 json feature：cargo build --features json")
}
```

使用方控制 features：

```toml
my-lib = "0.1"                                              # 默认 features
my-lib = { version = "0.1", features = ["xml", "json"] }    # 自定义
my-lib = { version = "0.1", default-features = false, features = ["json"] }  # 禁用默认
```

> ⚠️ **Feature 统一**：如果依赖 A 和 B 都依赖 `serde`，A 启用了 `derive`，则所有使用者都会获得 `derive` feature。

---

## Workspace 多包项目

```toml
# 根 Cargo.toml
[workspace]
members = ["crates/core", "crates/api", "crates/cli"]

[workspace.dependencies]       # 共享依赖版本
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
```

```
my_workspace/
├── Cargo.toml          ← workspace 根
├── Cargo.lock          ← 所有成员共享
└── crates/
    ├── core/Cargo.toml ← serde.workspace = true（继承）
    ├── api/Cargo.toml
    └── cli/Cargo.toml
```

> 💡 Workspace 优势：共享锁文件保证版本一致，共享 `target/` 避免重复编译，根目录 `cargo build` 一键编译所有成员。

---

## Cargo 命令速查

### 日常开发

| 命令 | 用途 | 常用选项 |
|------|------|---------|
| `cargo new / init` | 创建/初始化项目 | `--lib` |
| `cargo build` | 编译 | `--release`, `--features` |
| `cargo run` | 编译并运行 | `--release`, `-- ARGS` |
| `cargo check` | 仅检查（不生成二进制） | 比 build 快得多 |
| `cargo test` | 运行测试 | `--lib`, `-- --nocapture` |
| `cargo bench` | 基准测试 | 需要 nightly 或 criterion |

### 代码质量与依赖

| 命令 | 用途 |
|------|------|
| `cargo fmt` / `cargo fmt -- --check` | 格式化 / CI 检查 |
| `cargo clippy` / `cargo clippy -- -D warnings` | lint / 警告视为错误 |
| `cargo add serde` / `cargo remove serde` | 添加 / 移除依赖 |
| `cargo tree` / `cargo tree -d` | 依赖树 / 重复依赖 |
| `cargo update` | 更新 Cargo.lock |
| `cargo doc --open` | 生成文档并打开 |
| `cargo publish` / `cargo package` | 发布 / 本地验证 |

---

## Build Profiles 构建配置

```toml
[profile.dev]             # 默认开发配置——快速编译
opt-level = 0             # 无优化
debug = true              # 包含调试符号

[profile.release]         # 发布配置——完全优化
opt-level = 3             # 最高优化
lto = true                # 链接时优化
strip = true              # 去除调试符号（减小体积）
panic = "abort"           # panic 直接终止
```

| opt-level | 含义 | 编译速度 | 运行速度 |
|-----------|------|---------|---------|
| `0` | 无优化 | ⚡ 最快 | 🐢 最慢 |
| `2` | 适度优化 | 🚶 较慢 | 🚀 快 |
| `3` | 最大优化 | 🐢 慢 | 🚀 最快 |
| `"s"` / `"z"` | 优化/最小体积 | 🚶 较慢 | 🚀 快 |

> 💡 日常开发用 `cargo build`（秒级编译），发布前用 `cargo build --release`。

---

## 构建脚本与环境变量

`build.rs` 在编译前自动运行，用于代码生成、检测系统库、设置环境变量。

```rust
// build.rs（与 Cargo.toml 同级）
fn main() {
    println!("cargo:rustc-env=MY_VAR=hello");              // 设置环境变量
    println!("cargo:rerun-if-changed=src/proto.proto");     // 文件变化时重新运行
    println!("cargo:rustc-link-lib=ssl");                   // 链接系统库
}
```

常用环境变量：`CARGO_MANIFEST_DIR`、`CARGO_PKG_NAME`、`CARGO_PKG_VERSION`、`OUT_DIR`、`TARGET`、`PROFILE`

```rust
const VERSION: &str = env!("CARGO_PKG_VERSION");  // 编译时读取
```

> ⚠️ 输出格式是 `cargo:KEY=VALUE`，不是普通 println。Cargo 通过解析 stdout 获取构建指令。

---

## crates.io 生态系统

| 类别 | crate | 用途 |
|------|-------|------|
| 序列化 | `serde` | 通用序列化框架（几乎每个项目都用） |
| JSON | `serde_json` | JSON 解析 |
| 异步运行时 | `tokio` | 异步 I/O（生产首选） |
| HTTP | `reqwest` / `axum` | 客户端 / Web 框架 |
| CLI | `clap` | 命令行参数解析 |
| 日志 | `tracing` | 结构化日志和追踪 |
| 错误处理 | `anyhow` / `thiserror` | 简化错误处理 |
| 数据库 | `sqlx` / `diesel` | 异步 SQL / ORM |

---

## 常见陷阱

| 问题 | 原因 | 解决 |
|------|------|------|
| 类型不兼容（同名不同类型） | 同一库两个主版本并存 | `cargo tree -d` 排查 |
| Feature 意外启用 | Feature 统一机制 | 检查依赖树中的 feature |
| build.rs 失败 | 缺少系统库或路径错误 | `cargo build -vv` 查看详细输出 |
| 编译太慢 | debug 模式已足够，用 check | `cargo check` 代替 `cargo build` |
| 未使用依赖警告 | 加了依赖但代码没 use | 检查 feature 和 import |

---

## 本章小结

| 概念 | 说明 |
|------|------|
| `Cargo.toml` | 项目清单：包信息、依赖、features、profiles |
| `Cargo.lock` | 版本锁文件，保证可复现构建 |
| `dependencies` | 运行时依赖 |
| `dev-dependencies` | 仅测试/bench 依赖 |
| `build-dependencies` | 仅 build.rs 依赖 |
| `features` | 条件编译开关 |
| `workspace` | 多包项目管理 |
| `build.rs` | 构建脚本（编译前运行） |
| `profiles` | 构建配置（dev/release） |
| `crates.io` | Rust 包注册中心 |

### 实践建议

1. **新建项目后 `git init`**——Cargo.toml 和 Cargo.lock 都应纳入版本控制
2. **定期 `cargo clippy`**——发现潜在问题和改进点
3. **CI 中 `cargo fmt -- --check` + `cargo clippy -- -D warnings`**
4. **用 `cargo tree -d` 排查依赖问题**——重复依赖是诡异 bug 的根源
5. **日常开发用 `cargo check`**——比 `cargo build` 快得多
6. **发布前 `cargo package` 验证**——避免发布后才发现问题
7. **库项目不提交 Cargo.lock**，二进制项目务必提交
