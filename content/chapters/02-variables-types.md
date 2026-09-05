# 变量与类型

## 变量绑定

在 Rust 中，用 `let` 声明变量：

```rust
fn main() {
    let x = 5;
    println!("x = {}", x);
}
```

> 💡 Rust 用"绑定"（binding）而非"赋值"（assignment），强调变量与值的关联。

### 不可变 vs 可变

**Rust 的变量默认是不可变的（immutable）！** 这是和大多数语言最大的区别。

```rust
fn main() {
    let x = 5;
    x = 10;  // ❌ 编译错误：cannot assign twice to immutable variable `x`
}
```

要修改变量，需要显式加 `mut`：

```rust
fn main() {
    let mut x = 5;  // mut = mutable
    println!("x = {}", x);  // 5
    x = 10;  // ✅ 现在可以修改了
    println!("x = {}", x);  // 10
}
```

> 🔑 **为什么默认不可变？** 减少 bug、让编译器优化代码、让代码意图更清晰。

### 类型推导

Rust 有强大的类型推导，大多数时候不需要手动写类型：

```rust
fn main() {
    let x = 5;          // 编译器推导为 i32
    let y = 3.14;       // 推导为 f64
    let name = "Rust";  // 推导为 &str
    let is_fun = true;  // 推导为 bool
}
```

当然也可以显式标注：

```rust
fn main() {
    let x: i32 = 5;
    let y: f64 = 3.14;
    let name: &str = "Rust";
    let is_fun: bool = true;
}
```

## 遮蔽（Shadowing）

Rust 允许用同名变量"遮蔽"之前的变量：

```rust
fn main() {
    let x = 5;
    let x = x + 1;     // 遮蔽：创建了新的 x
    let x = x * 2;     // 再次遮蔽
    println!("x = {}", x);  // 12
}
```

### Shadowing vs mut 的区别

```rust
fn main() {
    // Shadowing：可以改变类型
    let spaces = "   ";       // &str
    let spaces = spaces.len(); // usize，类型变了！

    // mut：不能改变类型
    let mut spaces = "   ";
    // spaces = spaces.len();  // ❌ 类型不匹配
}
```

## 基本数据类型

Rust 是**静态类型**语言，所有类型在编译时确定。

### 整数类型

| 长度 | 有符号 | 无符号 |
|------|--------|--------|
| 8-bit | `i8` | `u8` |
| 16-bit | `i16` | `u16` |
| 32-bit | `i32`（默认） | `u32` |
| 64-bit | `i64` | `u64` |
| 128-bit | `i128` | `u128` |
| 平台相关 | `isize` | `usize` |

```rust
fn main() {
    let a: i32 = 42;       // 有符号 32 位
    let b: u32 = 42;       // 无符号 32 位
    let c: i64 = 1_000_000; // 下划线分隔，方便阅读
    let d: u8 = 255;       // u8 范围: 0 ~ 255

    // 不同进制字面量
    let hex = 0xff;        // 十六进制 = 255
    let oct = 0o77;        // 八进制 = 63
    let bin = 0b1111_0000; // 二进制 = 240
    let byte = b'A';       // 字节字面量 = 65
}
```

### 浮点数

```rust
fn main() {
    let x = 2.0;     // f64（默认，双精度）
    let y: f32 = 3.0; // f32（单精度）

    // 数学运算
    let sum = 5.0 + 10.0;
    let difference = 95.5 - 4.3;
    let product = 4.0 * 30.0;
    let quotient = 56.7 / 32.2;
    let remainder = 43.0 % 5.0;
}
```

### 布尔类型

```rust
fn main() {
    let t = true;
    let f: bool = false;
    println!("true AND false = {}", t && f);  // false
    println!("true OR false = {}", t || f);   // true
}
```

### 字符类型

```rust
fn main() {
    let c = 'z';
    let z: char = 'ℤ';
    let heart = '❤';       // Rust 的 char 是 4 字节 Unicode
    let emoji = '🦀';      // 支持 emoji！
    println!("{} {} {} {}", c, z, heart, emoji);
}
```

> ⚠️ Rust 的 `char` 用单引号 `''`，字符串用双引号 `""`，和 C 一样。

### 元组（Tuple）

```rust
fn main() {
    // 固定长度，可以包含不同类型
    let tup: (i32, f64, &str) = (500, 6.4, "hello");

    // 解构
    let (x, y, z) = tup;
    println!("x={}, y={}, z={}", x, y, z);

    // 索引访问（从 0 开始）
    println!("first = {}", tup.0);
    println!("second = {}", tup.1);

    // 空元组（unit type）
    let unit: () = ();
}
```

### 数组（Array）

```rust
fn main() {
    // 固定长度，所有元素同类型
    let arr = [1, 2, 3, 4, 5];
    let first = arr[0];   // 1
    let second = arr[1];  // 2

    // 带类型标注
    let arr: [i32; 5] = [1, 2, 3, 4, 5];  // [类型; 长度]

    // 初始化相同值
    let zeros = [0; 10];  // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    // 越界访问会 panic（运行时崩溃）
    // let bad = arr[10];  // ❌ index out of bounds
}
```

## 类型转换

Rust 不会隐式转换类型，必须用 `as` 显式转换：

```rust
fn main() {
    let x: i32 = 42;
    let y: f64 = x as f64;    // i32 → f64
    let z: i64 = x as i64;    // i32 → i64

    let f: f64 = 3.99;
    let n: i32 = f as i32;    // f64 → i32（截断，不是四舍五入！）
    println!("{}", n);         // 3

    let big: i32 = 256;
    let small: u8 = big as u8; // 溢出！256 → 0
    println!("{}", small);      // 0
}
```

> ⚠️ `as` 转换可能溢出或截断，不会报错。安全的转换用 `try_into()`。

## 常量与静态变量

```rust
// 常量：编译时确定，必须标注类型，命名用 SCREAMING_SNAKE_CASE
const MAX_POINTS: u32 = 100_000;

// 静态变量：运行时存在，有固定内存地址
static LANGUAGE: &str = "Rust";

fn main() {
    println!("Max: {}", MAX_POINTS);
    println!("Lang: {}", LANGUAGE);
}
```

### const vs let

| 特性 | `const` | `let` |
|------|---------|-------|
| 类型标注 | 必须 | 可选 |
| 值 | 编译时常量 | 运行时计算 |
| 作用域 | 全局或函数内 | 块作用域 |
| 可变性 | 永远不可变 | 默认不可变，可加 `mut` |

## 数字溢出

```rust
fn main() {
    let x: u8 = 255;    // u8 最大值
    // let y: u8 = x + 1;  // debug 模式会 panic

    // 显式处理溢出
    let (result, overflowed) = 255u8.overflowing_add(1);
    println!("{} overflowed={}", result, overflowed);  // 0 true

    let result = 255u8.wrapping_add(1);   // 0（回绕）
    let result = 255u8.saturating_add(1); // 255（饱和）
    let result = 255u8.checked_add(1);    // None（检查）
}
```

## 常见错误

### 1. 忘记 mut

```rust
fn main() {
    let x = 5;
    x = 10;  // ❌ cannot assign twice to immutable variable
}
```

### 2. 类型不匹配

```rust
fn main() {
    let x: i32 = 5;
    let y: f64 = 3.0;
    // let z = x + y;  // ❌ cannot add `f64` to `i32`
    let z = x as f64 + y;  // ✅ 显式转换
}
```

### 3. 整数溢出

```rust
fn main() {
    let x: u8 = 200;
    let y: u8 = 100;
    // let z = x + y;  // debug 模式下 panic
    let z = x.wrapping_add(y);  // ✅ 明确处理
}
```

## 本章小结

| 概念 | 说明 |
|------|------|
| `let` | 不可变绑定 |
| `let mut` | 可变绑定 |
| Shadowing | 同名新变量遮蔽，可改变类型 |
| `i32` / `f64` | 默认整数/浮点类型 |
| `bool` | `true` / `false` |
| `char` | 4 字节 Unicode 字符 |
| `(T1, T2)` | 元组，固定长度，不同类型 |
| `[T; N]` | 数组，固定长度，相同类型 |
| `as` | 显式类型转换 |
| `const` | 编译时常量 |

**下一步**：学习函数与控制流 →
