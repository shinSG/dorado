# 模块系统

> 🔑 模块是 Rust 组织代码的核心机制。当项目超过几百行时，所有代码塞一个文件会难以维护。
> 模块系统让你按功能拆分代码、控制可见性、避免命名冲突。

## 为什么需要模块？

所有函数堆在一起找起来费劲，多人协作频繁命名冲突，想复用某段逻辑却发现和大量代码耦合，想隐藏内部实现细节却无能为力——模块系统就是来解决这些问题的。

| 概念 | 作用 | 类比 |
|------|------|------|
| `crate` | 整个编译单元，最大的模块 | 一本书 |
| `mod` | 声明一个模块 | 书的一章 |
| `pub` | 控制可见性 | 公开章节 vs 内部附录 |
| `use` | 引入路径，简化调用 | 书的索引 |

## 模块树结构

每个 Rust 项目都有一棵从 crate 根开始的**模块树**：

```
crate (my_project)
├── mod config
│   ├── pub struct AppConfig
│   └── fn validate()
├── mod database
│   ├── pub mod pool
│   │   └── pub struct ConnectionPool
│   └── pub mod models
│       ├── pub struct User
│       └── pub struct Order
├── mod utils
│   ├── pub fn format_date()
│   └── fn internal_helper()
└── mod error
    └── pub struct AppError
```

> 🔑 crate 根文件是 `src/main.rs`（二进制 crate）或 `src/lib.rs`（库 crate）。所有模块都挂在这棵树上。

## 定义模块：内联 vs 文件

**内联定义**——同一文件里用 `mod` 块，适合小型模块：

```rust
mod math {
    pub fn add(a: i32, b: i32) -> i32 { a + b }
    pub fn multiply(a: i32, b: i32) -> i32 { a * b }
    fn private_helper() -> i32 { 42 }  // 私有：模块外不可见
}
fn main() {
    println!("{}", math::add(1, 2));   // ✅ 3
    // math::private_helper();         // ❌ 编译错误
}
```

> ⚠️ 模块内所有项默认私有，只有标记 `pub` 的项才能从模块外部访问。

**文件式定义**——代码量大时拆到单独文件：

```
src/
├── main.rs          # crate 根
├── config.rs        # 对应 mod config
└── utils/
    ├── mod.rs       # 对应 mod utils（模块入口）
    └── helper.rs    # 对应 utils::helper 子模块
```

```rust
// src/main.rs
mod config;    // 声明模块——编译器去文件里找内容
mod utils;     // 查找 src/utils/mod.rs

fn main() {
    config::init();
    utils::helper::do_something();
}
```

> 💡 `mod config;` 是**声明模块存在**，`use config::init;` 是**导入路径**——完全不同的事。

**文件查找规则**：写 `mod foo;` 时编译器查找 `src/foo.rs`（Rust 2018+ 推荐）或 `src/foo/mod.rs`（旧风格）。新风格避免了目录下多个 `mod.rs` 标签难以区分的问题。

## 路径：绝对路径与相对路径

```rust
mod parent {
    pub fn parent_func() {}
    pub mod child {
        pub fn demo() {
            super::parent_func();           // super:: 父模块
            self::inner_helper();           // self:: 当前模块（通常省略）
            crate::parent::parent_func();   // crate:: crate 根
        }
        fn inner_helper() {}
    }
}
```

| 关键字 | 含义 | 示例 |
|--------|------|------|
| `crate::` | crate 根 | `crate::config::init()` |
| `self::` | 当前模块 | `self::helper()` |
| `super::` | 父模块 | `super::parent_fn()` |
| `模块名::` | 子模块 | `math::add()` |

> 💡 推荐用 `crate::` 绝对路径——更清晰，重构时不易出错。

## 可见性控制

```rust
mod outer {
    pub fn public_api() {}              // 所有人可见
    pub(crate) fn internal_api() {}     // 仅当前 crate 可见
    pub(super) fn parent_only() {}      // 仅父模块可见
    pub(in crate::outer) fn scoped() {} // 指定路径范围内可见
    fn private_fn() {}                  // 完全私有（默认）
}
```

| 修饰符 | 含义 | 谁能访问 |
|--------|------|----------|
| 无 | 私有 | 仅当前模块及其子模块 |
| `pub` | 公开 | 所有人 |
| `pub(crate)` | crate 内公开 | 当前 crate 内任何模块 |
| `pub(super)` | 上级公开 | 直接父模块 |
| `pub(in path)` | 范围公开 | 指定路径内的模块 |

### 结构体字段与枚举

结构体标记 `pub` 后**字段仍是私有的**，需要单独标记：

```rust
mod models {
    pub struct User {
        pub name: String,       // 公开
        pub email: String,      // 公开
        password_hash: String,  // 私有：外部无法直接访问
    }
    impl User {
        pub fn new(name: String, email: String, password: String) -> Self {
            User { name, email, password_hash: hash_password(&password) }
        }
        pub fn verify_password(&self, password: &str) -> bool {
            verify_hash(&self.password_hash, password)
        }
    }
    fn hash_password(pw: &str) -> String { String::new() }
    fn verify_hash(hash: &str, pw: &str) -> bool { false }
}
```

> 🔑 封装哲学：**公开行为，隐藏实现**。外部可以创建 User、验证密码，但无法获取密码哈希。

枚举和结构体不同——**枚举可见则所有变体自动可见**，因为变体是枚举类型的一部分。

## use 语句详解

`use` 把长路径引入当前作用域：

```rust
use std::collections::HashMap;              // 单个导入
use std::io::{self, Read, Write};           // 嵌套导入
use std::collections::{HashMap, HashSet};   // 同层多个
```

**重命名**——两个模块有同名类型时用 `as`：`use std::fmt::Result as FmtResult;`。也常用于缩短长名：`use serde_json::Value as Json;`

**Glob 导入**——`*` 导入所有公开项，仅推荐测试和 prelude 场景：

```rust
#[cfg(test)]
mod tests { use super::*; }  // 测试中引入父模块所有内容
```

> ⚠️ 生产代码避免 `use some_module::*`——污染命名空间，读者难以分辨名字来源。

## 重导出 pub use

`pub use` 把内部模块的项"提升"到外层，简化外部调用路径：

```rust
mod database {
    pub mod models { pub struct User { pub name: String } }
    pub mod connection { pub struct Pool {} }
}
pub use database::models::User;
pub use database::connection::Pool;

fn main() {
    let u = User { name: "Alice".into() }; // 不用写 database::models::User
}
```

> 🔑 `pub use` 让你**内部任意组织代码，对外提供简洁 API**——这是 Rust 库设计的核心技巧。

## 文件组织演进

**小型**：单文件 `src/main.rs` 即可。**中型**：按功能拆 3-5 个模块文件。**大型**：目录模块：

```
src/
├── main.rs
├── config.rs
├── models/          mod.rs + user.rs + order.rs
├── utils/           mod.rs + string.rs + date.rs
└── handlers/        mod.rs + auth.rs + api.rs
```

**Workspace**——多 crate 共享 `Cargo.lock` 和 `target/`，编译更快：

```
my_workspace/
├── Cargo.toml    [workspace] members = ["core","api","cli"]
├── core/         核心库
├── api-server/   Web 服务
└── cli/          命令行工具
```

## 实战：组织一个库

```
mylib/src/
├── lib.rs           # 库入口，定义公共 API
├── config.rs        # 配置管理
├── error.rs         # 错误类型
├── models/          # mod.rs + user.rs + order.rs
├── utils/           # mod.rs + string.rs
└── internal/        # 完全私有，对外不可见
```

```rust
// src/lib.rs —— "门面"
mod config;
mod internal;
pub mod error;
pub mod models;
pub mod utils;
pub use error::AppError;
pub use models::user::User;
pub use models::order::Order;
pub use config::AppConfig;
pub fn init(config_path: &str) -> Result<AppConfig, AppError> { config::load(config_path) }
```

```rust
// src/error.rs
#[derive(Debug)]
pub enum AppError {
    ConfigNotFound(String),
    ParseError { field: String, message: String },
    IoError(std::io::Error),
}
impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::ConfigNotFound(p) => write!(f, "配置文件未找到: {}", p),
            AppError::ParseError { field, message } => write!(f, "解析错误，字段 {}: {}", field, message),
            AppError::IoError(e) => write!(f, "IO 错误: {}", e),
        }
    }
}
impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self { AppError::IoError(e) }
}
```

```rust
// src/models/user.rs
#[derive(Debug, Clone)]
pub struct User {
    pub id: u64, pub name: String, pub email: String,
    role: String,  // 私有
}
impl User {
    pub fn new(id: u64, name: &str, email: &str) -> Self {
        User { id, name: name.into(), email: email.into(), role: "user".into() }
    }
    pub fn is_admin(&self) -> bool { self.role == "admin" }
    pub(crate) fn set_role(&mut self, role: &str) { self.role = role.into(); }
}
```

> 🔑 设计要点：`lib.rs` 是门面定义 API 表面；内部模块对外完全不可见；`pub use` 提供平坦 API。

## 常见错误与陷阱

**mod 和 use 混淆**——`mod config;` 声明模块存在，`use config::load;` 缩短路径，完全不是一回事。

**忘记 pub**——模块内所有项默认私有。结构体 `pub` 了但字段没 `pub`，外部无法构造实例。

**文件命名不匹配**——`mod my_module;` 要求 `my_module.rs` 或 `my_module/mod.rs`，大小写必须一致。

**循环依赖**——A 引用 B、B 引用 A 会导致问题。解决：提取共用类型到独立模块。

**lib.rs 和 main.rs 重复声明**——它们是两棵独立的模块树。二进制 crate 应 `use my_lib::utils;` 引入库模块，而非重复 `mod utils;`。

## 本章小结

| 操作 | 语法 | 说明 |
|------|------|------|
| 声明模块 | `mod foo;` | 查找 foo.rs 或 foo/mod.rs |
| 内联模块 | `mod foo { ... }` | 当前文件中定义 |
| 公开项 | `pub fn / pub struct` | 允许外部访问 |
| crate 内可见 | `pub(crate) fn` | 仅当前 crate 可用 |
| 父模块可见 | `pub(super) fn` | 仅父模块可用 |
| 导入 | `use path::to::item;` | 引入当前作用域 |
| 嵌套导入 | `use path::{A, B};` | 一次导入多个 |
| 重命名 | `use A as B;` | 避免命名冲突 |
| 重导出 | `pub use A;` | 对外暴露内部项 |
| 绝对路径 | `crate::mod::item` | 从 crate 根开始 |
| 父模块 | `super::item` | 从父模块开始 |
| 当前模块 | `self::item` | 从当前模块开始 |

### 实践建议

1. **小项目**：一个 `main.rs` 就够
2. **中型项目**：按功能拆 3-5 个模块
3. **大型项目**：目录模块 + workspace
4. **库项目**：`pub use` 设计干净的公共 API
5. **默认私有**：先写私有，需要时再加 `pub`
6. **路径风格**：优先用 `crate::` 绝对路径

> 💡 核心就一句话：**`mod` 声明结构，`pub` 控制可见性，`use` 简化路径**。
