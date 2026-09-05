# 引用与借用

## 上一章的痛点

上一章我们遇到一个问题：函数使用完值后，还要把它还回来：

```rust
fn calculate_length(s: String) -> (String, usize) {
    let length = s.len();
    (s, length)  // 还要把 s 传回去，太麻烦了
}
```

**引用（Reference）** 解决了这个问题。

## 不可变引用 `&T`

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}   // s 离开作用域，但不 drop（因为它不拥有这个值）

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s);  // &s 创建一个引用
    println!("\"{}\" 的长度是 {}", s, len);  // ✅ s 仍然有效！
}
```

> 🔑 **`&` 创建引用的行为叫做借用（borrowing）。** 借用不转移所有权。

### 引用的内存模型

```
s ──→ 堆: "hello"
            ↑
&s ────────┘  （引用指向 s 指向的数据，但不拥有它）
```

## 可变引用 `&mut T`

如果想通过引用修改值，需要可变引用：

```rust
fn add_world(s: &mut String) {
    s.push_str(", world!");
}

fn main() {
    let mut s = String::from("hello");
    add_world(&mut s);  // 传可变引用
    println!("{}", s);  // "hello, world!"
}
```

注意三处 `mut`：
1. `let mut s` — 变量本身要声明为可变
2. `&mut s` — 创建可变引用
3. `s: &mut String` — 参数类型标注为可变引用

## 借用规则（极其重要）

> **规则 1**：在任意时刻，你只能拥有以下两者**之一**：
> - 任意数量的不可变引用 `&T`
> - 或者**一个**可变引用 `&mut T`
>
> **规则 2**：引用必须始终有效（不能有悬垂引用）

### 违反规则 1：多个可变引用

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &mut s;
    let r2 = &mut s;  // ❌ cannot borrow `s` as mutable more than once
    println!("{}, {}", r1, r2);
}
```

**为什么？** 防止数据竞争（data race）。多个可变引用同时修改数据是未定义行为。

### 违反规则 1：可变与不可变共存

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &s;      // 不可变引用
    let r2 = &s;      // 另一个不可变引用 ✅
    let r3 = &mut s;  // ❌ 不能同时有不可变和可变引用
    println!("{}, {}, {}", r1, r2, r3);
}
```

**为什么？** 不可变引用期望数据不变，可变引用可能修改数据，两者共存会导致不可变引用读到脏数据。

### NLL（Non-Lexical Lifetimes）

Rust 的引用生命周期在**最后一次使用后**就结束了，不是到花括号结束：

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &s;
    println!("{}, {}", r1, r2);  // r1 和 r2 最后一次使用

    // ✅ r1 和 r2 的生命周期已经结束
    let r3 = &mut s;
    println!("{}", r3);
}
```

## 悬垂引用（Dangling Reference）

Rust 编译器保证引用永远不会悬垂：

```rust
fn dangle() -> &String {  // ❌ 返回对局部变量的引用
    let s = String::from("hello");
    &s  // s 在函数结束时被 drop，引用指向已释放的内存
}
```

编译器报错：`this function's return type contains a borrowed value, but there is no value for it to be borrowed from`

**修复**：返回所有权而不是引用：

```rust
fn no_dangle() -> String {
    let s = String::from("hello");
    s  // 移动所有权给调用者
}
```

## 生命周期初探

生命周期（lifetime）是引用的有效范围，大多数时候编译器自动推导：

```rust
// 编译器自动推导：返回值的生命周期 = 参数的生命周期
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for (i, &byte) in bytes.iter().enumerate() {
        if byte == b' ' {
            return &s[..i];
        }
    }
    s
}

fn main() {
    let sentence = String::from("hello world");
    let word = first_word(&sentence);
    println!("第一个单词: {}", word);
}
```

### 需要手动标注的情况

当编译器无法确定返回值引用哪个参数的生命周期时：

```rust
// ❌ 编译器不知道返回值的生命周期和 a 还是 b 相关
// fn longest(x: &str, y: &str) -> &str { ... }

// ✅ 用生命周期标注 'a
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let s1 = String::from("long string");
    let result;
    {
        let s2 = String::from("xyz");
        result = longest(s1.as_str(), s2.as_str());
        println!("最长: {}", result);  // ✅ s2 还活着
    }
    // println!("{}", result);  // ❌ s2 已经 drop，result 可能悬垂
}
```

> 💡 `'a` 不改变引用的实际生命周期，只是告诉编译器"返回值的生命周期和参数中较短的那个一样"。

### 生命周期语法

| 写法 | 含义 |
|------|------|
| `&i32` | 不可变引用 |
| `&'a i32` | 带生命周期标注的不可变引用 |
| `&'a mut i32` | 带生命周期标注的可变引用 |

### 结构体中的生命周期

如果结构体持有引用，必须标注生命周期：

```rust
struct Excerpt<'a> {
    text: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().unwrap();
    let excerpt = Excerpt { text: first_sentence };
    println!("{}", excerpt.text);
}
```

> `'a` 表示 `Excerpt` 实例的生命周期不能超过它引用的 `text` 的生命周期。

## 常见模式总结

### 模式 1：借用读取

```rust
fn print_length(s: &String) {
    println!("长度: {}", s.len());
}
// 函数只读取，不修改 → 用 &T
```

### 模式 2：借用修改

```rust
fn append(s: &mut String, suffix: &str) {
    s.push_str(suffix);
}
// 函数需要修改参数 → 用 &mut T
```

### 模式 3：获取所有权

```rust
fn consume(s: String) {
    println!("消费: {}", s);
}   // s 被 drop
// 函数需要拥有值 → 用 T（不带 &）
```

## 常见错误

### 1. 可变引用重复

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &mut s;
    let r2 = &mut s;  // ❌
}
```

**修复**：用花括号分隔作用域，或让引用的生命周期不重叠。

### 2. 不可变引用期间修改

```rust
fn main() {
    let mut s = String::from("hello");
    let r = &s;
    s.push_str(" world");  // ❌ 不能在有不可变引用时修改
    println!("{}", r);
}
```

### 3. 返回局部变量的引用

```rust
fn bad() -> &String {
    let s = String::from("hello");
    &s  // ❌ s 马上要被 drop
}
```

**修复**：返回 `String`（转移所有权）。

### 4. 生命周期不够长

```rust
fn main() {
    let r;
    {
        let x = 5;
        r = &x;  // ❌ x 的生命周期太短
    }
    println!("{}", r);
}
```

## 本章小结

| 概念 | 说明 |
|------|------|
| `&T` | 不可变引用，借用但不拥有 |
| `&mut T` | 可变引用，可以修改数据 |
| 借用规则 | 要么多个 `&T`，要么一个 `&mut T` |
| NLL | 引用在最后使用后即结束 |
| 悬垂引用 | Rust 编译器禁止，编译时就报错 |
| `'a` | 生命周期标注，告诉编译器引用间的关系 |
| 结构体 + 引用 | 必须标注生命周期 |

> 🎯 **核心理解**：引用让你"借用"数据而不获取所有权，借用规则保证了数据安全。

**恭喜！** 你已经掌握了 Rust 最核心的概念。接下来进入系统编程，学习智能指针和并发 →
