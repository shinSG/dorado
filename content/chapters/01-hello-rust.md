# Hello Rust

## 什么是 Rust？

Rust 是一门现代系统编程语言，由 Mozilla 于 2010 年发起，2015 年发布 1.0 正式版。它的设计目标是：

- **安全**：在编译期消除内存错误（空指针、悬垂引用、数据竞争）
- **高效**：没有垃圾回收器，性能媲美 C/C++
- **现代**：强大的类型系统、模式匹配、零成本抽象

> 💡 **一句话理解**：Rust 让你在编译时就发现 bug，而不是在运行时崩溃。

## 为什么学 Rust？

| 对比 | C/C++ | Python | Rust |
|------|-------|--------|------|
| 内存安全 | ❌ 手动管理 | ✅ GC | ✅ 所有权系统 |
| 性能 | ⚡ 极快 | 🐢 慢 | ⚡ 极快 |
| 学习曲线 | 陡峭 | 平缓 | 较陡但值得 |
| 并发安全 | ❌ 需要锁 | ❌ GIL | ✅ 编译期保证 |

Rust 连续多年被 Stack Overflow 评为"最受喜爱的编程语言"。

## 安装 Rust

### 使用 rustup（推荐）

```bash
# Linux / macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装完成后，重启终端或执行：
source "$HOME/.cargo/env"

# 验证安装
rustc --version
cargo --version
```

### rustup 是什么？

`rustup` 是 Rust 的工具链管理器，类似 Python 的 pyenv 或 Node 的 nvm：

- 管理多个 Rust 版本（stable / beta / nightly）
- 更新 Rust：`rustup update`
- 切换版本：`rustup default stable`

## Cargo — 你的瑞士军刀

`cargo` 是 Rust 的构建工具和包管理器，类似 Python 的 pip + setuptools：

```bash
# 创建新项目
cargo new hello-rust
cd hello-rust

# 项目结构
hello-rust/
├── Cargo.toml    # 项目配置（类似 package.json / pyproject.toml）
└── src/
    └── main.rs   # 入口文件
```

### Cargo.toml 详解

```toml
[package]
name = "hello-rust"    # 项目名
version = "0.1.0"      # 版本号
edition = "2021"       # Rust 版本标准（2015/2018/2021/2024）

[dependencies]          # 第三方依赖（类似 requirements.txt）
serde = "1.0"          # 序列化库
```

## 第一个程序

```rust
fn main() {
    println!("Hello, Rust!");
}
```

### 代码解析

- `fn main()` — 程序入口函数，`fn` 是 function 的缩写
- `{ }` — 花括号包裹函数体
- `println!` — 注意这个 `!`，它表示这是一个**宏**（macro），不是普通函数
- `"Hello, Rust!"` — 字符串字面量
- `;` — 语句以分号结尾

### 运行方式

```bash
# 方式 1：cargo run（编译 + 运行，开发时最常用）
cargo run

# 方式 2：先编译再运行
cargo build
./target/debug/hello-rust

# 方式 3：release 模式（优化编译，适合发布）
cargo build --release
./target/release/hello-rust
```

## 常用 Cargo 命令

```bash
cargo run           # 编译并运行
cargo build         # 编译（debug 模式）
cargo build --release  # 编译（release 模式，优化）
cargo check         # 只检查语法，不生成二进制（最快）
cargo test          # 运行测试
cargo doc --open    # 生成并打开文档
cargo fmt           # 格式化代码
cargo clippy        # 代码静态检查（给你建议）
```

> 💡 `cargo check` 比 `cargo build` 快很多，开发时用它来快速检查错误。

## 注释

```rust
// 单行注释

/* 多行注释
   可以跨越多行 */

/// 文档注释（用于生成文档）
/// # 示例
/// ```
/// let x = add(1, 2);
/// ```
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

## println! 宏

`println!` 是最常用的输出宏，类似 C 的 `printf`：

```rust
fn main() {
    // 基本输出
    println!("Hello, world!");

    // 带变量（占位符 {}）
    let name = "Rust";
    let year = 2015;
    println!("Hello, {}! Born in {}", name, year);

    // 调试输出（{:?}）
    let numbers = vec![1, 2, 3];
    println!("numbers = {:?}", numbers);

    // 命名参数
    println!("{lang} is great!", lang = "Rust");

    // 数字格式化
    println!("{:.2}", 3.14159);  // 3.14
    println!("{:05}", 42);       // 00042
}
```

## 常见错误

### 1. 忘记分号

```rust
fn main() {
    println!("Hello")  // ❌ 编译错误：expected `;`
}
```

### 2. main 函数拼写错误

```rust
fn Main() {  // ❌ Rust 找不到 main 入口（小写 m）
    println!("Hello");
}
```

### 3. 中文引号

```rust
fn main() {
    println!(“Hello”);  // ❌ 中文引号 ≠ 英文引号
}
```

## 本章小结

| 概念 | 说明 |
|------|------|
| `rustup` | 工具链管理器 |
| `cargo` | 构建工具 + 包管理 |
| `fn main()` | 程序入口 |
| `println!` | 输出宏（注意 `!`） |
| `cargo run` | 编译并运行 |
| `cargo check` | 快速语法检查 |
| `Cargo.toml` | 项目配置文件 |

**下一步**：学习变量与类型系统 →
