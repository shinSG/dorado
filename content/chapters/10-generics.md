# 泛型（Generics）

## 为什么需要泛型？

你写了一个函数找出切片中的最大值，第二天产品经理说"也需要找 `f64` 的最大值"，
你只好复制粘贴改类型。第三天又要支持 `char`……

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];
    for item in &list[1..] {
        if item > largest { largest = item; }
    }
    largest
}
fn largest_f64(list: &[f64]) -> &f64 { /* 逻辑完全一样 */ }
fn largest_char(list: &[char]) -> &char { /* 逻辑完全一样 */ }
// 代码重复！这就是 DRY 原则的反面教材。
```

> 🔑 **DRY 原则**（Don't Repeat Yourself）：同一逻辑只写一次。泛型是 Rust 实现 DRY 的核心武器。

---

## 单态化：泛型背后的魔法

Rust 不像 Java/Python 那样用"类型擦除"或"运行时装箱"。它在**编译时**把泛型
展开成每个具体类型的专属代码，所以零运行时开销。

```
┌────────────────────────────────────────────────────────┐
│  你写的泛型代码                                         │
│                                                        │
│  fn add<T>(a: T, b: T) -> T { a + b }                 │
│                  │                                     │
│                  │  编译器在编译时展开（单态化）          │
│                  ▼                                     │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │ fn add_i32(a: i32│    │ fn add_f64(a: f64│          │
│  │     b: i32)->i32 │    │     b: f64)->f64 │          │
│  │ { a + b }        │    │ { a + b }        │          │
│  └──────────────────┘    └──────────────────┘          │
│  每种类型 → 独立函数，运行时无额外开销！                 │
└────────────────────────────────────────────────────────┘
```

> 💡 **零成本抽象**：编译器生成的机器码和你手写每个具体类型版本的性能完全一样。

---

## 泛型函数

### 基本用法与 Trait Bound

```rust
// T 是类型参数，<T: PartialOrd> 要求 T 必须支持比较
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in &list[1..] {
        if item > largest { largest = item; }
    }
    largest
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("最大数: {}", largest(&numbers));
    let chars = vec!['y', 'm', 'a', 'q'];
    println!("最大字符: {}", largest(&chars));
}
```

### Where 子句与多个约束

当约束复杂时用 `where` 子句更清晰：

```rust
fn largest_print<T>(list: &[T]) -> &T
where
    T: PartialOrd + std::fmt::Display,  // 多个约束用 + 连接
{
    let mut largest = &list[0];
    for item in &list[1..] {
        if item > largest { largest = item; }
    }
    largest
}
```

### 多个泛型参数与返回泛型

```rust
// T 和 U 可以是不同类型
fn compare<T, U>(a: T, b: U)
where
    T: Into<f64> + std::fmt::Display,
    U: Into<f64> + std::fmt::Display,
{
    let diff = (a.into() - b.into()).abs();
    println!("a={}, b={}, 差值={}", a, b, diff);
}

// 返回泛型类型（返回值类型由输入决定）
fn create_pair<T: Clone>(value: T) -> (T, T) {
    (value.clone(), value)
}
```

---

## 泛型结构体

### 单参数与多参数

```rust
// 单参数：x 和 y 必须是同一类型
struct Point<T> {
    x: T,
    y: T,
}

// 多参数：x 和 y 可以是不同类型
struct Point2<T, U> {
    x: T,
    y: U,
}

fn main() {
    let p1 = Point { x: 5, y: 10 };        // Point<i32>
    let p2 = Point2 { x: 5, y: 1.0 };      // Point2<i32, f64>
    // let bad = Point { x: 5, y: 1.0 };    // ❌ 类型必须一致
}
```

### 默认类型参数

```rust
// U 默认和 T 同类型，大多数场景不用手动指定
struct Container<T, U = T> {
    primary: T,
    secondary: U,
}

fn main() {
    let c1 = Container { primary: 1, secondary: 2 };       // Container<i32, i32>
    let c2 = Container { primary: 1, secondary: 2.0_f64 }; // Container<i32, f64>
}
```

> 🔑 默认类型参数让你在大多数场景下省略类型，同时保留灵活性。

---

## 泛型枚举：Option 和 Result 深入

### Option<T>

```rust
fn find_user(id: u32) -> Option<String> {
    if id == 1 { Some("张三".to_string()) } else { None }
}

fn main() {
    // map：转换 Some 中的值
    let greeting = find_user(1).map(|n| format!("你好, {}!", n));

    // unwrap_or：提供默认值
    let name = find_user(99).unwrap_or("未知用户".to_string());

    // and_then：链式调用，每一步都可能返回 None
    let result = find_user(1)
        .and_then(|n| if n.len() > 0 { Some(n) } else { None })
        .unwrap_or_default();
}
```

### Result<T, E>

```rust
fn parse_age(input: &str) -> Result<u32, String> {
    match input.parse::<u32>() {
        Ok(age) if age <= 150 => Ok(age),
        Ok(_) => Err("年龄不合理".to_string()),
        Err(e) => Err(format!("解析失败: {}", e)),
    }
}

fn main() {
    // map_err：转换错误类型
    let age = parse_age("abc").map_err(|e| format!("输入错误: {}", e));
}
```

> 🔑 `Option<T>` 用于"可能没有值"，`Result<T, E>` 用于"可能失败并需要原因"。

---

## 泛型方法

### 为所有 T 实现 / 为特定类型实现

```rust
struct Point<T> { x: T, y: T }

// 为所有 T 实现方法（impl 后面必须声明 <T>）
impl<T> Point<T> {
    fn x(&self) -> &T { &self.x }
}

// 只为 Point<f64> 实现（需要 sqrt、powi 等 f64 专属方法）
impl Point<f64> {
    fn distance_from_origin(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

fn main() {
    let p1 = Point { x: 5, y: 10 };
    println!("x = {}", p1.x());

    let p2 = Point { x: 3.0, y: 4.0 };
    println!("距离 = {}", p2.distance_from_origin()); // 5.0
    // p1.distance_from_origin(); // ❌ Point<i32> 没有这个方法
}
```

> ⚠️ `impl<T>` 中的 `<T>` 是必须的！`impl Point<T>` 和 `impl<T> Point<T>` 完全不同。

### 方法自身的泛型参数

```rust
impl<T> Point<T> {
    // U 是方法自己的泛型参数，与结构体的 T 独立
    fn mixup<U>(self, other: Point<U>) -> Point<T, U> { ... }
}
```

---

## Const 泛型

常量参数，常用于数组长度：

```rust
fn print_array<T: std::fmt::Debug, const N: usize>(arr: [T; N]) {
    println!("长度 {} 的数组: {:?}", N, arr);
}

fn main() {
    print_array([1, 2, 3]);        // N=3
    print_array([10, 20, 30, 40]); // N=4
}
```

> 🔑 Const 泛型让你写出适用于任意长度数组的函数。

---

## PhantomData 模式

有时候你需要泛型参数但不直接使用它的值：

```rust
use std::marker::PhantomData;

struct Measurement<Unit> {
    value: f64,
    _unit: PhantomData<Unit>,  // 零大小标记，不占内存
}

struct Meters;
struct Seconds;

fn main() {
    let distance: Measurement<Meters> = Measurement { value: 100.0, _unit: PhantomData };
    let time: Measurement<Seconds> = Measurement { value: 9.58, _unit: PhantomData };
    // 不能混用：编译器会阻止 Meters 和 Seconds 的错误运算
}
```

---

## 零成本抽象 vs 动态分发

| 对比 | 泛型（静态分发） | trait 对象（动态分发） |
|------|----------------|---------------------|
| 分发时机 | 编译时 | 运行时 |
| 性能 | 更快（可内联） | 略慢（vtable 查找） |
| 二进制大小 | 更大（每种类型一份代码） | 更小 |
| 灵活性 | 编译时确定所有类型 | 可存不同类型到同一容器 |

> 💡 大多数时候优先用泛型。只在需要异构集合或运行时多态时才用 trait 对象。

---

## 常见陷阱

```rust
// ① 缺少 trait bound
fn bad_max<T>(a: T, b: T) -> T {
    if a > b { a } else { b }  // ❌ T 没有 PartialOrd
}
fn good_max<T: PartialOrd>(a: T, b: T) -> T { if a > b { a } else { b } }

// ② Turbofish 语法：编译器无法推导时手动指定
let num = "42".parse::<i32>().unwrap();  // ::<> 看起来像鱼，叫 turbofish

// ③ 类型推导的局限
let v: Vec<i32> = Vec::new();  // 需要标注，否则不知道类型
```

---

## 实战：泛型栈

```rust
struct Stack<T> { elements: Vec<T> }

impl<T> Stack<T> {
    fn new() -> Self { Stack { elements: Vec::new() } }
    fn push(&mut self, item: T) { self.elements.push(item); }
    fn pop(&mut self) -> Option<T> { self.elements.pop() }
    fn peek(&self) -> Option<&T> { self.elements.last() }
    fn is_empty(&self) -> bool { self.elements.is_empty() }
    fn size(&self) -> usize { self.elements.len() }
}

// 条件实现：只有 T: Display 时才能打印
impl<T: std::fmt::Display> Stack<T> {
    fn print_all(&self) {
        for (i, item) in self.elements.iter().enumerate() {
            println!("  [{}] {}", i, item);
        }
    }
}

fn main() {
    let mut stack = Stack::new();  // 编译器推导为 Stack<i32>
    stack.push(10);
    stack.push(20);
    stack.print_all();
    println!("栈顶: {:?}", stack.peek());  // Some(20)
}
```

---

## 本章小结

| 概念 | 语法 | 说明 |
|------|------|------|
| 泛型参数 | `<T>` | 类型参数 |
| 多参数 | `<T, U>` | 多个独立类型参数 |
| 默认参数 | `<T = i32>` | 可省略时使用默认类型 |
| Trait bound | `T: Display + Clone` | 约束泛型必须实现的 trait |
| Where 子句 | `where T: Trait` | 更清晰的约束写法 |
| 泛型实现 | `impl<T>` | 为所有 T 实现方法 |
| 特定实现 | `impl Point<f64>` | 只为具体类型实现 |
| Const 泛型 | `const N: usize` | 编译时常量参数 |
| 单态化 | — | 编译时展开，零运行时开销 |
| Turbofish | `func::<T>()` | 手动指定泛型类型 |

## 练习建议

1. 写一个泛型函数 `min_value<T: PartialOrd>` 找切片最小值
2. 写一个泛型结构体 `Pair<T>` 存两个相同类型的值，实现 `new`、`swap`
3. 给 `Pair<T>` 加条件实现：`T: Display` 时才能 `print`
4. 给 `Stack<T>` 加 `contains` 方法（需要 `T: PartialEq`）
5. 用 const 泛型写一个函数接受任意长度数组并求和

> 💡 泛型 + trait 是 Rust 最强大的两个工具组合。后续的 trait 对象和生命周期都会大量依赖泛型。
