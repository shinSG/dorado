# 第八章：错误处理

## 设计哲学：为什么 Rust 没有异常？

大多数语言（Java、Python、C++）使用**异常机制**来处理错误：函数可能在任何地方抛出异常，
调用者可以选择捕获或者不捕获。这带来了几个问题：

1. **不可见性** — 函数签名不告诉你它可能抛什么异常
2. **控制流混乱** — `throw` 打断正常执行路径，难以追踪
3. **忘记处理** — 编译器不强制你 catch，运行时才会炸

Rust 选择了完全不同的路：**错误是类型的一部分，编译器强制你处理**。

```
┌─────────────────────────────────────────────────────────────┐
│                    其他语言（异常机制）                        │
│                                                             │
│   fn read_file() → String    // 可能抛异常？看不出来！        │
│                                                             │
│   fn main() {                                               │
│       let s = read_file();   // 看起来没问题...               │
│       println!("{}", s);     // 如果抛异常了呢？              │
│   }                                                         │
│   // 编译通过 ✅  运行时崩溃 💥                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Rust（类型系统强制）                        │
│                                                             │
│   fn read_file() → Result<String, io::Error>  // 错误写在类型里│
│                                                             │
│   fn main() {                                               │
│       let s = read_file();   // 类型是 Result，不是 String    │
│       println!("{}", s);     // ❌ 编译错误！不能直接用        │
│   }                                                         │
│   // 编译失败 ❌  —— 强制你处理错误                           │
└─────────────────────────────────────────────────────────────┘
```

> 🔑 **核心原则**：Rust 把错误处理从"运行时问题"变成了"编译时问题"。

---

## 两种错误：不可恢复 vs 可恢复

| 类型 | 处理方式 | 适用场景 | 类比 |
|------|---------|---------|------|
| **不可恢复** | `panic!` → 程序崩溃 | 逻辑 bug、违反不变量 | 大楼着火 → 立刻撤离 |
| **可恢复** | `Result<T, E>` → 调用者决定 | 文件不存在、网络超时 | 门锁了 → 找钥匙或换条路 |

> 💡 **判断标准**：如果这个错误说明"程序逻辑有 bug"，用 `panic!`；如果是"外部世界不按预期"，用 `Result`。

---

## panic! — 不可恢复错误

### 基本用法

```rust
fn main() {
    // 显式 panic — 用于"不应该发生"的情况
    panic!("程序进入了不可能的状态！");

    // 隐式 panic — 标准库在检测到错误时会 panic
    let v = vec![1, 2, 3];
    v[99];  // index out of bounds → 自动 panic
}
```

### panic 的调用栈展开（Stack Unwinding）

当 `panic!` 被触发时，Rust 默认会**展开调用栈**：

```
panic! 触发
    │
    ▼
┌──────────────────┐
│  当前函数         │ ← Rust 沿着调用栈逐层往回走
│  清理局部变量      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  调用者函数       │ ← 每一层都会执行 drop（析构）
│  清理局部变量      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  main 函数       │ ← 到达栈底，程序终止
│  打印错误信息      │
└──────────────────┘
```

如果想直接终止（不清理，更快），在 `Cargo.toml` 中配置：

```toml
[profile.release]
panic = "abort"  # 直接终止，不展开栈
```

### RUST_BACKTRACE — 查看完整调用栈

```bash
# 环境变量设置
export RUST_BACKTRACE=1    # 基本调用栈
export RUST_BACKTRACE=full # 详细调用栈（包含所有帧）

# 运行程序
cargo run
```

> 💡 调试 panic 时，**第一反应**应该是设置 `RUST_BACKTRACE=1`，然后看调用栈定位问题。

### catch_unwind — 在特殊场景下捕获 panic

大多数时候你不应该捕获 panic，但有些场景需要（比如线程不能把 panic 传染给其他线程）：

```rust
use std::panic;

fn main() {
    let result = panic::catch_unwind(|| {
        panic!("出问题了！");
    });

    match result {
        Ok(_) => println!("正常完成"),
        Err(_) => println!("捕获到 panic，程序继续运行"),
    }

    println!("程序没有崩溃！");
}
```

> ⚠️ `catch_unwind` 只能捕获**展开式** panic，对 `panic = "abort"` 无效。不要用它代替正确的错误处理。

---

## Result\<T, E\> — 可恢复错误的核心

### 基本定义

```rust
enum Result<T, E> {
    Ok(T),    // 成功，包含值
    Err(E),   // 失败，包含错误
}
```

### 基本用法：match 匹配

```rust
use std::fs::File;

fn main() {
    let result = File::open("hello.txt");

    let file = match result {
        Ok(file) => {
            println!("文件打开成功");
            file  // 返回文件句柄
        }
        Err(error) => {
            println!("打开失败: {}", error);
            return;  // 提前退出
        }
    };

    // 这里可以安全使用 file
}
```

### 细分错误类型：嵌套 match

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let file = match File::open("hello.txt") {
        Ok(file) => file,
        Err(error) => match error.kind() {
            // 文件不存在 → 创建它
            ErrorKind::NotFound => match File::create("hello.txt") {
                Ok(fc) => fc,
                Err(e) => panic!("创建文件失败: {}", e),
            },
            // 其他错误 → panic
            other_error => panic!("打开文件失败: {:?}", other_error),
        },
    };
}
```

> 💡 嵌套 match 可读性差？后面会学 `?` 操作符和 `unwrap_or_else` 来简化。

### unwrap 和 expect — 快捷方式

```rust
use std::fs::File;

fn main() {
    // unwrap：成功返回值，失败 panic（没有自定义消息）
    let f = File::open("hello.txt").unwrap();

    // expect：和 unwrap 一样，但可以自定义 panic 消息
    let f = File::open("hello.txt").expect("无法打开 hello.txt");
}
```

| 方法 | 成功时 | 失败时 | 适用场景 |
|------|--------|--------|---------|
| `unwrap()` | 返回 `T` | panic（默认消息） | 原型/测试 |
| `expect("msg")` | 返回 `T` | panic（自定义消息） | 你知道不会失败时 |
| `match` | 你决定 | 你决定 | 生产代码 |

> ⚠️ `unwrap` 在**库代码**中几乎永远不应该出现 — 调用者没有选择，被迫 panic。

---

## ? 操作符 — 错误传播的语法糖

### 基本机制

`?` 放在 `Result` 后面，作用是：

- **成功** → 解包，取出 `Ok` 里的值，继续执行
- **失败** → 提前返回 `Err`（经过 `From` 转换后）

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username() -> Result<String, io::Error> {
    let mut file = File::open("username.txt")?;  // 失败 → return Err(e)
    let mut username = String::new();
    file.read_to_string(&mut username)?;          // 失败 → return Err(e)
    Ok(username)                                   // 成功 → 返回值
}
```

等价于：

```rust
fn read_username() -> Result<String, io::Error> {
    let mut file = match File::open("username.txt") {
        Ok(f) => f,
        Err(e) => return Err(e),  // ? 自动做了这个
    };
    let mut username = String::new();
    match file.read_to_string(&mut username) {
        Ok(_) => {}
        Err(e) => return Err(e),  // ? 自动做了这个
    };
    Ok(username)
}
```

### 链式调用

```rust
// 多个 ? 可以链起来
fn read_username() -> Result<String, io::Error> {
    let mut username = String::new();
    File::open("username.txt")?.read_to_string(&mut username)?;
    Ok(username)
}

// 最终简化版 — 标准库已经提供了这个函数
fn read_username_short() -> Result<String, io::Error> {
    std::fs::read_to_string("username.txt")
}
```

### 在 main 函数中使用 ?

默认 `main` 返回 `()`，不能用 `?`。改成返回 `Result` 即可：

```rust
use std::fs;

// main 可以返回 Result！
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string("config.txt")?;
    println!("{}", content);
    Ok(())  // 成功时返回 ()
}
```

> 🔑 `Box<dyn std::error::Error>` 是"任意错误"类型，适合 `main` 和快速原型，但不适合库代码（调用者无法区分错误类型）。

---

## 自定义错误类型

### 为什么需要自定义错误？

标准库的 `io::Error`、`ParseIntError` 等只描述各自的错误。当你的函数可能遇到多种错误时，
需要一个**统一的错误类型**来包裹它们。

### 手动实现（理解原理）

```rust
use std::fmt;
use std::num::ParseIntError;
use std::io;

// 第一步：定义错误枚举
#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(ParseIntError),
    Custom(String),
}

// 第二步：实现 Display — 错误的人类可读描述
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::Io(e) => write!(f, "IO 错误: {}", e),
            AppError::Parse(e) => write!(f, "解析错误: {}", e),
            AppError::Custom(msg) => write!(f, "{}", msg),
        }
    }
}

// 第三步：实现 std::error::Error trait
impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            AppError::Io(e) => Some(e),       // 返回底层错误
            AppError::Parse(e) => Some(e),
            AppError::Custom(_) => None,      // 没有底层错误
        }
    }
}

// 第四步：实现 From trait — 让 ? 操作符自动转换
impl From<io::Error> for AppError {
    fn from(e: io::Error) -> Self {
        AppError::Io(e)
    }
}

impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> Self {
        AppError::Parse(e)
    }
}

// 现在可以在同一个函数中使用 ? 处理不同错误！
fn read_and_parse(path: &str) -> Result<i32, AppError> {
    let content = std::fs::read_to_string(path)?;  // io::Error → AppError
    let number: i32 = content.trim().parse()?;       // ParseIntError → AppError
    Ok(number)
}
```

### 使用 thiserror crate — 减少样板代码

手动写 `Display`、`From` 很繁琐。`thiserror` 用宏自动生成：

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum AppError {
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),       // 自动实现 From + Display

    #[error("解析错误: {0}")]
    Parse(#[from] std::num::ParseIntError),

    #[error("{0}")]
    Custom(String),
}

// 代码量减少 60%+，功能完全一样
```

> 💡 生产项目推荐 `thiserror`（库代码）或 `anyhow`（应用代码）。

---

## 错误处理策略：何时用什么？

```
遇到错误时，你有 4 种选择：

┌─────────────────┬──────────────────────────────────────────────┐
│ 方式             │ 何时使用                                      │
├─────────────────┼──────────────────────────────────────────────┤
│ Result + ?      │ 默认选择！错误传播给调用者处理                   │
│ unwrap/expect   │ 你 100% 确定不会失败，或在测试/原型中            │
│ panic!          │ 程序进入了"不可能"的状态，继续运行没有意义        │
│ unwrap_or 系列  │ 有合理的默认值可以使用                          │
└─────────────────┴──────────────────────────────────────────────┘
```

### unwrap_or 系列组合子

```rust
fn main() {
    let s = "not_a_number";

    // unwrap_or：失败时使用默认值
    let n: i32 = s.parse().unwrap_or(0);             // n = 0

    // unwrap_or_else：失败时用闭包计算默认值
    let n: i32 = s.parse().unwrap_or_else(|e| {
        eprintln!("解析失败: {}，使用默认值 0", e);
        0
    });

    // unwrap_or_default：失败时用类型的默认值（i32 默认是 0）
    let n: i32 = s.parse().unwrap_or_default();       // n = 0
}
```

### Result 的组合子（Combinators）

```rust
fn main() {
    let input = "42";

    // map：对 Ok 值进行转换
    let doubled: Result<i32, _> = input.parse::<i32>().map(|n| n * 2);
    // Ok(84)

    // and_then：链式操作，每步都可能失败
    let result: Result<i32, _> = input
        .parse::<i32>()
        .and_then(|n| {
            if n > 0 { Ok(n) }
            else { Err("必须是正数".into()) }
        });

    // or_else：Err 时尝试恢复
    let result: Result<i32, _> = "abc"
        .parse::<i32>()
        .or_else(|_| "42".parse::<i32>());  // 第一次失败，用 "42" 重试
    // Ok(42)

    // map_err：转换错误类型
    let result: Result<i32, String> = "abc"
        .parse::<i32>()
        .map_err(|e| format!("解析失败: {}", e));
}
```

---

## 实战示例：配置文件加载器

一个真实场景：从文件加载配置，可能遇到多种错误。

```rust
use std::collections::HashMap;
use std::fs;
use std::num::ParseIntError;
use thiserror::Error;

// 定义错误类型
#[derive(Error, Debug)]
enum ConfigError {
    #[error("配置文件未找到: {0}")]
    FileNotFound(String),

    #[error("读取失败: {0}")]
    ReadError(#[from] std::io::Error),

    #[error("配置格式错误: {0}")]
    ParseError(String),
}

// 配置结构体
struct Config {
    host: String,
    port: u16,
    debug: bool,
}

impl Config {
    fn load(path: &str) -> Result<Config, ConfigError> {
        // 第一步：检查文件是否存在
        if !fs::metadata(path).is_ok() {
            return Err(ConfigError::FileNotFound(path.to_string()));
        }

        // 第二步：读取文件内容
        let content = fs::read_to_string(path)?;  // ? 自动转换为 ConfigError

        // 第三步：解析配置
        let mut map = HashMap::new();
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;  // 跳过空行和注释
            }
            let parts: Vec<&str> = line.splitn(2, '=').collect();
            if parts.len() != 2 {
                return Err(ConfigError::ParseError(
                    format!("无效的配置行: {}", line)
                ));
            }
            map.insert(parts[0].trim(), parts[1].trim());
        }

        // 第四步：提取字段
        let host = map.get("host")
            .ok_or(ConfigError::ParseError("缺少 host 字段".into()))?
            .to_string();

        let port: u16 = map.get("port")
            .ok_or(ConfigError::ParseError("缺少 port 字段".into()))?
            .parse()
            .map_err(|e: ParseIntError| ConfigError::ParseError(
                format!("port 不是有效数字: {}", e)
            ))?;

        let debug = map.get("debug")
            .map(|s| *s == "true")
            .unwrap_or(false);  // debug 是可选的，默认 false

        Ok(Config { host, port, debug })
    }
}

fn main() {
    match Config::load("app.conf") {
        Ok(config) => {
            println!("服务启动于 {}:{}", config.host, config.port);
        }
        Err(ConfigError::FileNotFound(path)) => {
            eprintln!("找不到配置文件 '{}'，请检查路径", path);
            std::process::exit(1);
        }
        Err(ConfigError::ParseError(msg)) => {
            eprintln!("配置文件格式错误: {}", msg);
            std::process::exit(1);
        }
        Err(e) => {
            eprintln!("加载配置失败: {}", e);
            std::process::exit(1);
        }
    }
}
```

> 🔑 这个例子展示了真实项目中错误处理的完整模式：自定义错误类型 → 多种失败模式 → 优雅的错误信息。

---

## 常见陷阱

### 1. 在库代码中使用 unwrap

```rust
// ❌ 错误：调用者被迫 panic
pub fn parse_config(s: &str) -> Config {
    let port: u16 = s.parse().unwrap();  // 如果 s 不是数字呢？
}

// ✅ 正确：把选择权交给调用者
pub fn parse_config(s: &str) -> Result<Config, ParseIntError> {
    let port: u16 = s.parse()?;
    Ok(Config { port })
}
```

### 2. main 中忘记改返回类型

```rust
// ❌ 错误：main 返回 ()，不能用 ?
fn main() {
    let f = File::open("test.txt")?;  // 编译错误
}

// ✅ 正确：main 返回 Result
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let f = File::open("test.txt")?;
    Ok(())
}
```

### 3. 错误信息丢失上下文

```rust
// ❌ 错误：错误信息被吞掉
fn load(path: &str) -> Result<String, io::Error> {
    fs::read_to_string(path)  // 调用者只知道"读取失败"，不知道是哪个文件
}

// ✅ 正确：保留上下文
fn load(path: &str) -> Result<String, AppError> {
    fs::read_to_string(path)
        .map_err(|e| AppError::Custom(format!("读取 {} 失败: {}", path, e)))
}
```

### 4. 滥用 unwrap_or 掩盖错误

```rust
// ❌ 危险：悄悄吞掉错误，用默认值掩盖问题
let port: u16 = config_str.parse().unwrap_or(8080);
// 如果配置文件写了 port=abc，你不会知道，程序默默用 8080

// ✅ 更好：至少记录一下
let port: u16 = config_str.parse().unwrap_or_else(|e| {
    eprintln!("⚠️ 端口解析失败 ({}), 使用默认值 8080", e);
    8080
});
```

---

## 本章总结

| 概念 | 说明 |
|------|------|
| `panic!` | 不可恢复错误，展开调用栈，程序终止 |
| `Result<T, E>` | 可恢复错误，编译器强制处理 |
| `unwrap` / `expect` | 快捷解包，失败时 panic |
| `?` 操作符 | 错误传播语法糖，自动提前返回 `Err` |
| `From` trait | 错误类型转换，让 `?` 自动适配 |
| `thiserror` | 减少自定义错误的样板代码 |
| `unwrap_or` 系列 | 提供默认值，避免 panic |
| 组合子 | `map`/`and_then`/`or_else` — 函数式错误处理 |

### 练习建议

1. **改造旧代码**：找出你之前写的程序中所有 `unwrap()`，逐个改成 `Result` + `?`
2. **自定义错误**：为你的项目定义一个 `AppError` 枚举，包含所有可能的错误类型
3. **错误链**：写一个函数，用 `?` 链式调用 3 个可能失败的操作
4. **组合子练习**：只用 `map`/`and_then`/`unwrap_or_else` 完成一个数据转换管道，不用 `match`

> 🔑 记住：**好的错误处理是区分"能跑"和"可靠"的关键分界线。** 你的程序不应该在遇到意外时默默崩溃或给出毫无意义的错误信息。
