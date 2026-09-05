# 所有权系统

## 为什么需要所有权？

内存管理是编程语言的核心问题。三种主流方案：

| 方案 | 代表语言 | 优点 | 缺点 |
|------|---------|------|------|
| 手动管理 | C/C++ | 性能好 | 内存泄漏、悬垂指针 |
| 垃圾回收 | Java/Python/Go | 安全 | 性能开销、停顿 |
| **所有权系统** | **Rust** | **安全 + 高效** | 学习曲线 |

> 🔑 **所有权是 Rust 的灵魂。** 理解它，就理解了 Rust 的一半。

## 栈与堆

先理解数据存储在哪里：

```
栈 (Stack)                  堆 (Heap)
┌──────────────┐           ┌──────────────┐
│ 快速、自动管理  │           │ 慢速、需要管理  │
│ 大小固定       │           │ 大小可变       │
│ 后进先出       │           │ 任意访问       │
├──────────────┤           ├──────────────┤
│ i32 = 5      │           │ "hello"      │
│ bool = true  │    指针 →  │ [1, 2, 3]    │
│ f64 = 3.14   │           │ ...          │
└──────────────┘           └──────────────┘
```

- **栈**：整数、浮点、布尔、字符等固定大小的类型
- **堆**：String、Vec、Box 等动态大小的类型

## 所有权三规则

> **规则 1**：Rust 中每个值都有一个**所有者**（owner）
>
> **规则 2**：同一时刻只能有**一个**所有者
>
> **规则 3**：当所有者离开作用域时，值被**自动释放**（drop）

```rust
fn main() {
    {                      // s 还不存在
        let s = String::from("hello");  // s 从这里开始有效
        println!("{}", s);              // 使用 s
    }                      // s 离开作用域，内存被释放（自动调用 drop）
    // println!("{}", s);  // ❌ s 已经不存在了
}
```

## Move 语义

这是 Rust 和其他语言最不一样的地方：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;  // s1 的值被 MOVE 到 s2

    // println!("{}", s1);  // ❌ s1 已经无效了！
    println!("{}", s2);     // ✅ s2 是新的所有者
}
```

### 为什么需要 Move？

如果 `s1` 和 `s2` 都指向同一块堆内存，两个都离开作用域时会**重复释放**（double free）。Rust 通过 Move 从根本上避免了这个问题。

```
Move 之前：                    Move 之后：
s1 ──→ 堆: "hello"           s1 ──✗（已失效）
                               s2 ──→ 堆: "hello"
```

### 什么类型会 Move？

```rust
fn main() {
    // String — Move
    let s1 = String::from("hello");
    let s2 = s1;       // Move，s1 失效

    // i32 — Copy
    let x = 5;
    let y = x;         // Copy，x 仍然有效
    println!("x={}, y={}", x, y);  // ✅
}
```

> 💡 实现了 `Copy` trait 的类型（整数、浮点、布尔、字符、元组）是**复制**而不是 Move。

## Clone — 深拷贝

如果确实需要两个独立的副本，用 `clone()`：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();  // 深拷贝：在堆上复制一份新的

    println!("s1 = {}", s1);  // ✅ 两个都有效
    println!("s2 = {}", s2);
}
```

> ⚠️ `clone()` 可能很昂贵（堆分配），只在需要时使用。

## Copy vs Move 总结

| 类型 | 赋值行为 | 原因 |
|------|---------|------|
| `i32`, `f64`, `bool`, `char` | Copy（复制） | 大小固定，在栈上，复制成本低 |
| `(i32, f64)` | Copy（如果所有元素都 Copy） | 元组的 Copy 取决于元素 |
| `String` | Move（转移） | 数据在堆上，需要管理内存 |
| `Vec<T>` | Move（转移） | 同上 |
| `&str`, `&T` | Copy（复制引用） | 引用本身是 Copy 的 |

## 函数与所有权

### 传参会转移所有权

```rust
fn takes_ownership(s: String) {
    println!("got: {}", s);
}   // s 在这里被 drop

fn main() {
    let s = String::from("hello");
    takes_ownership(s);      // s 的所有权转移给了函数参数
    // println!("{}", s);    // ❌ s 已经失效
}
```

### 返回值也会转移所有权

```rust
fn gives_ownership() -> String {
    let s = String::from("hello");
    s  // 所有权转移给调用者
}

fn main() {
    let s = gives_ownership();  // 接收所有权
    println!("{}", s);          // ✅
}
```

### 如果想保留所有权？

```rust
fn calculate_length(s: String) -> (String, usize) {
    let length = s.len();
    (s, length)  // 把 s 还回去
}

fn main() {
    let s1 = String::from("hello");
    let (s2, len) = calculate_length(s1);  // 接收返回的所有权
    println!("\"{}\" 的长度是 {}", s2, len);
}
```

> 这样太麻烦了！下一章学**引用和借用**，优雅地解决这个问题。

## 值的生命周期

```rust
fn main() {
    let a = 1;          // a 的生命周期开始
    {
        let b = 2;      // b 的生命周期开始
        println!("{}", a + b);
    }                   // b 的生命周期结束，值被 drop
    println!("{}", a);
}                       // a 的生命周期结束
```

Rust 编译器在编译时就能确定每个值在哪里被 drop，不需要运行时垃圾回收。

## 常见错误

### 1. 使用已 Move 的变量

```rust
fn main() {
    let s = String::from("hello");
    let s2 = s;
    println!("{}", s);  // ❌ value used here after move
}
```

**修复**：用 `.clone()` 或调整代码顺序。

### 2. 函数调用后继续使用

```rust
fn print_string(s: String) {
    println!("{}", s);
}

fn main() {
    let s = String::from("hello");
    print_string(s);
    print_string(s);  // ❌ value used here after move
}
```

**修复**：传引用 `&s`（下一章）或 clone。

### 3. 整数看起来没问题？

```rust
fn main() {
    let x = 5;
    let y = x;
    println!("x={}, y={}", x, y);  // ✅ 整数是 Copy 的
}
```

这不违反所有权规则，因为整数实现了 `Copy` trait — 赋值时复制一份新的。

## 与其他语言的对比

```python
# Python — 引用计数 GC
a = [1, 2, 3]
b = a          # a 和 b 指向同一个列表
b.append(4)
print(a)       # [1, 2, 3, 4] — a 也变了！
```

```rust
// Rust — 所有权转移
let a = vec![1, 2, 3];
let b = a;     // a 的所有权转移给 b
// println!("{:?}", a);  // ❌ a 已失效
println!("{:?}", b);     // ✅ 只有 b 有效
```

Rust 不会有"修改一个变量意外影响另一个"的问题。

## 本章小结

| 概念 | 说明 |
|------|------|
| 所有权三规则 | 每个值一个所有者、同时一个、离开作用域自动释放 |
| Move | 赋值/传参转移所有权，原变量失效 |
| Copy | 整数等简单类型赋值时复制，原变量仍有效 |
| Clone | 显式深拷贝，可能昂贵 |
| 作用域 | 变量的有效范围，离开即 drop |
| 自动 Drop | 不需要手动释放内存 |

> 🎯 **核心理解**：Rust 通过所有权系统在编译期保证内存安全，不需要 GC 也不会有内存泄漏。

**下一步**：学习引用与借用，解决"函数用完值要还回来"的问题 →
