# 第七章：枚举与模式匹配

枚举（enum）是 Rust 类型系统的核心支柱。它把"一个值只能是几种可能之一"编码到类型里，配合模式匹配（pattern matching），编译器在编译期帮你检查所有情况是否都被处理。

> 🔑 **枚举描述"是什么"，模式匹配处理"怎么办"——两者配合，写出不会遗漏任何分支的代码。**

---

## 1. 为什么要用枚举？

现实世界的"非此即彼"无处不在：红绿灯（红/黄/绿）、支付方式（现金/信用卡/微信）、网络地址（IPv4/IPv6）。没有枚举的语言用字符串表示，编译器无法检查拼错或遗漏。Rust 的枚举在类型层面封死了所有可能性。

**枚举 vs 结构体：** 结构体表示"同时拥有 A **和** B"，枚举表示"要么是 A **或** B **或** C"。

---

## 2. 定义枚举

```rust
enum Direction { North, South, East, West }

enum IpAddr {
    V4(u8, u8, u8, u8),  // 4 个字节
    V6(String),            // 一个字符串
}

fn main() {
    let home = IpAddr::V4(127, 0, 0, 1);
    let loopback = IpAddr::V6(String::from("::1"));
    // home 和 loopback 是同一类型，但内部结构完全不同
}
```

变体有四种形态：无数据（`Quit`）、命名字段（`Move { x, y }`）、元组式单值（`Write(String)`）、元组式多值（`ChangeColor(i32,i32,i32)`）。

> 💡 每个变体的括号里可以放任意类型，甚至可以嵌套另一个枚举。

---

## 3. 内存布局：标签 + 数据

```
  enum Shape { Circle(f64), Rect(f64, f64) }

  Shape::Circle(3.14)
  ┌──────────┬────────────┐
  │ tag = 0  │ 3.14 (f64) │   ← 标签 0 = Circle
  └──────────┴────────────┘

  Shape::Rect(2.0, 5.0)
  ┌──────────┬──────────┬──────────┐
  │ tag = 1  │ 2.0(f64) │ 5.0(f64) │  ← 标签 1 = Rect
  └──────────┴──────────┴──────────┘

  枚举大小 = 最大变体数据 + 标签 + 对齐填充
```

> 🔑 某个变体特别大时，用 `Box<T>` 装箱减小整体体积。

---

## 4. Option\<T\> —— Rust 没有 null

C/Java 中任何指针都可能是 `null`，编译器不提醒检查。Rust 用 `Option<T>` 彻底消灭 null：

```rust
enum Option<T> { Some(T), None }  // 标准库定义

fn main() {
    let some_number: Option<i32> = Some(42);
    let no_number: Option<i32> = None;
    // ❌ let result = some_number + 1;  // 不能直接当 i32 用！
    // ✅ 必须先处理 None 的可能
    match some_number {
        Some(n) => println!("数字: {}", n),
        None => println!("没有数字"),
    }
}
```

> 🔑 **Option 强制你处理"值可能不存在"——Rust 没有"十亿美元的错误"（null reference）。**

### 常用方法

```rust
let x: Option<i32> = Some(5);
let y: Option<i32> = None;
x.unwrap_or(0);       // 有值用值，没值用默认 → 5
y.unwrap_or(0);       // → 0
x.map(|n| n * 2);     // 对 Some 变换 → Some(10)
x.is_some();          // → true
```

### 真实场景

**用户输入解析：**

```rust
fn parse_age(input: &str) -> Option<u32> {
    match input.trim().parse::<u32>() {
        Ok(n) if n <= 150 => Some(n),
        _ => None,
    }
}
```

**配置查找：**

```rust
use std::collections::HashMap;
fn get_config(key: &str) -> Option<String> {
    let mut config = HashMap::new();
    config.insert("host", "127.0.0.1");
    config.get(key).map(|s| s.to_string())  // 找到 Some，找不到 None
}
```

---

## 5. match 表达式

```rust
fn handle(msg: Message) {
    match msg {
        Message::Quit => println!("退出"),
        Message::Move { x, y } => println!("移动到 ({}, {})", x, y),
        Message::Write(text) => println!("文本: {}", text),
        Message::ChangeColor(r, g, b) => println!("颜色: {} {} {}", r, g, b),
    }
}
```

> 🔑 **match 必须穷尽所有变体**，漏掉一个编译器直接报错。

`match` 本身是表达式，每个分支返回值：

```rust
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        None => None,
        Some(i) => Some(i + 1),
    }
}
```

---

## 6. 模式匹配的完整形态

### 字面量与范围

```rust
match x {
    0 => println!("零"),
    2..=9 => println!("一位数"),   // 范围模式
    _ => println!("其他"),          // 通配符
}
```

### 匹配守卫

模式后面加 `if` 条件：

```rust
match score {
    n if n >= 90 => println!("优秀: {}", n),
    n if n >= 60 => println!("及格: {}", n),
    n => println!("不及格: {}", n),
}
```

### 多模式（|）

```rust
matches!(c, 'a' | 'e' | 'i' | 'o' | 'u')  // matches! 宏简化布尔判断
```

### 解构结构体

```rust
struct Point { x: i32, y: i32 }
match p {
    Point { x: 0, y: 0 } => println!("原点"),
    Point { x, y: 0 }    => println!("在 x 轴上, x = {}", x),
    Point { x: 0, y }    => println!("在 y 轴上, y = {}", y),
    Point { x, y }       => println!("普通点 ({}, {})", x, y),
}
```

### @ 绑定

匹配范围的同时绑定变量：

```rust
match age {
    n @ 0..=12  => println!("儿童, {}岁", n),
    n @ 13..=17 => println!("青少年, {}岁", n),
    n           => println!("成年人, {}岁", n),
}
```

### 忽略模式（_ 和 ..）

```rust
let (first, _, third) = (1, 2, 3);       // _ 忽略中间值
let Point { x, .. } = Point { x: 1, y: 2, z: 3 }; // .. 忽略其余字段
```

### 嵌套模式

```rust
enum Color { Rgb(u8, u8, u8), Named(String) }
enum Shape { Circle(f64), Rectangle(f64, f64) }
enum Drawing { Filled(Shape, Color), Outline(Shape, Color, f64) }

match &drawing {
    Drawing::Filled(Shape::Circle(r), Color::Rgb(255, 0, 0)) =>
        println!("红色填充圆, 半径 {}", r),
    Drawing::Outline(_, _, width) =>
        println!("描边图形, 线宽 {}", width),
    _ => {}
}
```

> 🔑 嵌套模式让你在一行代码里同时拆解多层数据结构。

---

## 7. if let / let-else / while let

**if let** —— 只关心一个模式：

```rust
if let Some(max) = config_max {
    println!("最大值: {}", max);
}
```

**let-else** —— 匹配失败时早返回（Rust 1.65+）：

```rust
let Some(word) = s.split_whitespace().next() else {
    return None;  // 不匹配就退出函数
};
```

**while let** —— 循环直到不匹配：

```rust
let mut stack = vec![1, 2, 3];
while let Some(top) = stack.pop() {
    println!("弹出: {}", top);  // 3, 2, 1
}
```

---

## 8. 枚举方法

```rust
impl Message {
    fn call(&self) {
        match self {
            Message::Quit => println!("退出"),
            Message::Write(text) => println!("写入: {}", text),
            _ => println!("其他"),
        }
    }
}
```

---

## 9. 常见陷阱

### 忘记通配符

```rust
// ❌ non-exhaustive patterns: `None` not covered
// match x { Some(n) => println!("{}", n) }
// ✅ 加上 None 或 _
match x { Some(n) => println!("{}", n), None => {} }
```

### 盲目 unwrap()

```rust
let number: Option<i32> = "abc".parse().ok();
// ❌ None 时 panic
// let n = number.unwrap();
// ✅ 安全
let n = number.unwrap_or(0);
```

> ⚠️ `unwrap()` 只在你 100% 确定有值时使用。生产代码用 `match`、`if let`、`unwrap_or` 替代。

### match 中意外移动

```rust
let name = Some(String::from("Alice"));
// ❌ match 移动了 String，之后 name 不可用
// match name { Some(n) => println!("{}", n), None => {} }
// println!("{:?}", name);  // 错误！
// ✅ 用引用匹配
match &name { Some(n) => println!("{}", n), None => {} }
println!("{:?}", name);  // 仍然可用
```

---

## 10. 实战：简单命令解析器

```rust
enum Command {
    Help,
    Echo(String),
    Add(i32, i32),
    Greet { name: String, loud: bool },
}

fn parse(input: &str) -> Option<Command> {
    let parts: Vec<&str> = input.trim().splitn(3, ' ').collect();
    match parts.as_slice() {
        ["help"] => Some(Command::Help),
        ["echo", text] => Some(Command::Echo(text.to_string())),
        ["add", a, b] => {
            let a = a.parse::<i32>().ok()?;  // ? 自动传播 None
            let b = b.parse::<i32>().ok()?;
            Some(Command::Add(a, b))
        }
        ["greet", name] => Some(Command::Greet {
            name: name.to_string(), loud: false }),
        ["greet", name, "--loud"] => Some(Command::Greet {
            name: name.to_string(), loud: true }),
        _ => None,
    }
}

fn execute(cmd: &Command) {
    match cmd {
        Command::Help => println!("命令: help, echo, add, greet"),
        Command::Echo(text) => println!("{}", text),
        Command::Add(a, b) => println!("{} + {} = {}", a, b, a + b),
        Command::Greet { name, loud: true } =>
            println!("你好, {}!", name.to_uppercase()),
        Command::Greet { name, loud: false } =>
            println!("你好, {}", name),
    }
}
```

> 🔑 综合运用了：枚举定义、match 穷尽匹配、`?` 操作符、结构体解构、匹配守卫。

---

## 本章小结

| 概念 | 说明 |
|------|------|
| `enum` | 定义枚举，变体可携带不同类型数据 |
| `Option<T>` | `Some(T)` 或 `None`，替代 null |
| `match` | 模式匹配，必须穷尽所有变体 |
| `if let` | 只关心一个模式时的简写 |
| `let-else` | 匹配失败时早返回 |
| 匹配守卫 | `pattern if condition`，额外条件筛选 |
| `@` 绑定 | `n @ pattern`，匹配同时绑定值 |
| `_` / `..` | 忽略不需要的值或字段 |

### 练习建议

1. **基础：** 定义 `TrafficLight` 枚举，为每种灯实现方法返回等待秒数
2. **进阶：** 用 `Option` 和 `match` 写简易计算器，处理除以零
3. **挑战：** 扩展命令解析器，添加 `repeat <n> <text>` 命令

> 💡 模式匹配是 Rust 最优雅的特性之一。多写多用，很快就会爱上它。
