# Trait（特征）

## 为什么需要 Trait？

在面向对象语言中，我们用**接口（interface）**定义共享行为，用**继承（inheritance）**实现多态。
Rust 没有类和继承，但提供了更强大的替代方案：**Trait**。

> 🔑 Trait 是 Rust 的多态基石——它定义"能做什么"，而不是"是什么"。

```
┌─────────────────────────────────────────────────────────────┐
│                  Trait 的核心作用                            │
│                                                             │
│   继承（Java/C++）          Trait（Rust）                   │
│   ───────────────           ────────────                    │
│   class Dog extends Animal  struct Dog;                     │
│   "Dog IS-A Animal"         impl Animal for Dog             │
│                             "Dog CAN act as Animal"         │
│                                                             │
│   紧耦合                     松耦合                          │
│   单继承                     多 trait                         │
│   运行时虚表                 编译时单态化 / 运行时虚表        │
└─────────────────────────────────────────────────────────────┘
```

Trait 让你：
- 定义共享行为接口
- 为任意类型实现（甚至你没有定义的类型）
- 用泛型约束实现编译时多态
- 用 trait 对象实现运行时多态

---

## 定义 Trait

Trait 定义一组方法签名，类似于其他语言的接口：

```rust
// 定义一个 Summary trait，要求实现者提供 summarize 方法
trait Summary {
    // 必须实现的方法（只有签名，没有方法体）
    fn summarize(&self) -> String;

    // 默认实现（可选覆盖）
    fn preview(&self) -> String {
        format!("{}...", &self.summarize()[..20.min(self.summarize().len())])
    }
}
```

> 💡 Trait 中的方法可以分为两类：
> - **必须实现的方法**：只有签名，实现者必须提供方法体
> - **默认方法**：有方法体，实现者可以选择覆盖或直接使用

### 关联函数

Trait 也可以定义不带 `self` 的关联函数（类似静态方法）：

```rust
trait Deserialize {
    // 关联函数，不带 self
    fn from_json(json: &str) -> Self where Self: Sized;
}
```

---

## 为结构体实现 Trait

用 `impl Trait for Type` 语法为具体类型实现 trait：

```rust
struct Article {
    title: String,
    content: String,
}

struct Tweet {
    username: String,
    text: String,
}

// 为 Article 实现 Summary
impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{}: {}", self.title, &self.content[..50.min(self.content.len())])
    }
}

// 为 Tweet 实现 Summary（不同实现）
impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("@{}: {}", self.username, self.text)
    }
    // preview() 使用默认实现
}

fn main() {
    let article = Article {
        title: String::from("Rust 1.80 发布"),
        content: String::from("新版本带来了许多改进..."),
    };
    let tweet = Tweet {
        username: String::from("rustlang"),
        text: String::from("Rust 1.80 is here!"),
    };

    println!("{}", article.summarize()); // Rust 1.80 发布: 新版本带来了许...
    println!("{}", tweet.summarize());   // @rustlang: Rust 1.80 is here!
}
```

> 🔑 同一个 trait 可以为不同类型提供不同的实现，这就是多态！

---

## Trait 作为参数（Trait 约束）

### `impl Trait` 语法（语法糖）

```rust
// 接受任何实现了 Summary 的类型
fn notify(item: &impl Summary) {
    println!("快讯: {}", item.summarize());
}
```

### Trait Bound 语法（更灵活）

```rust
// 完全等价，但可以表达更复杂的约束
fn notify<T: Summary>(item: &T) {
    println!("快讯: {}", item.summarize());
}
```

### 多重约束

```rust
use std::fmt::{Display, Debug};

// impl Trait 语法 + 多重约束
fn notify1(item: &(impl Summary + Display)) {
    println!("{}", item);
}

// Trait bound 语法 + 多重约束
fn notify2<T: Summary + Display>(item: &T) {
    println!("{}", item);
}
```

### `where` 子句（复杂约束更清晰）

当约束很长时，`where` 子句可读性更好：

```rust
use std::fmt::{Display, Debug};

// 不用 where（很挤）
fn some_function<T: Display + Clone, U: Clone + Debug>(t: &T, u: &U) -> String {
    format!("{}", t)
}

// 用 where（更清晰）
fn some_function<T, U>(t: &T, u: &U) -> String
where
    T: Display + Clone,
    U: Clone + Debug,
{
    format!("{}", t)
}
```

> 💡 当有 3 个以上泛型参数或约束超过 2 个时，推荐使用 `where` 子句。

---

## Trait Bound 约束表

| 写法 | 含义 |
|------|------|
| `fn f(x: impl A)` | 语法糖，接受任何实现了 A 的类型 |
| `fn f<T: A>(x: &T)` | trait bound，T 必须实现 A |
| `fn f<T: A + B>(x: &T)` | T 必须同时实现 A 和 B |
| `fn f<T>(x: &T) where T: A` | where 子句，等价于上面 |
| `fn f<T: A + B>(x: &T) where T: Debug` | 混合写法 |

---

## 返回 Trait

### 返回 `impl Trait`（静态分发）

```rust
fn create_summarizable() -> impl Summary {
    Article {
        title: String::from("标题"),
        content: String::from("内容..."),
    }
}
```

> ⚠️ `impl Trait` 作为返回类型时，函数体内**只能返回同一种具体类型**。
> 下面的代码**编译失败**：
> ```rust
> // ❌ 错误！返回了两种不同类型
> fn create(flag: bool) -> impl Summary {
>     if flag {
>         Tweet { ... }    // 类型 A
>     } else {
>         Article { ... }  // 类型 B ← 不允许！
>     }
> }
> ```

### 返回 `dyn Trait`（动态分发）

当需要返回不同类型时，使用 trait 对象：

```rust
fn create_summarizable(flag: bool) -> Box<dyn Summary> {
    if flag {
        Box::new(Article {
            title: String::from("标题"),
            content: String::from("内容..."),
        })
    } else {
        Box::new(Tweet {
            username: String::from("user"),
            text: String::from("推文..."),
        })
    }
}
```

---

## 静态分发 vs 动态分发

这是理解 trait 的关键概念：

```
┌──────────────────────────────────────────────────────────────────┐
│               静态分发 (impl Trait / T: Trait)                    │
│                                                                  │
│  编译时确定类型 → 单态化（Monomorphization） → 零成本抽象         │
│                                                                  │
│  代码中: fn notify<T: Summary>(item: &T)                         │
│                                                                  │
│  编译器生成:                                                      │
│  ┌────────────────────────┐  ┌────────────────────────┐          │
│  │ notify_Article(Article)│  │ notify_Tweet(Tweet)    │          │
│  │  直接调用具体方法       │  │  直接调用具体方法       │          │
│  └────────────────────────┘  └────────────────────────┘          │
│  优点: 最快  缺点: 代码膨胀                                      │
├──────────────────────────────────────────────────────────────────┤
│               动态分发 (dyn Trait)                                │
│                                                                  │
│  运行时确定类型 → 虚函数表（vtable） → 间接调用                   │
│                                                                  │
│  代码中: fn notify(item: &dyn Summary)                           │
│                                                                  │
│  内存布局:                                                        │
│  ┌─────────────────────┐                                         │
│  │ trait object (胖指针) │                                        │
│  │ ┌─────────────────┐ │                                         │
│  │ │ data_ptr ───────┼─┼──→ [Article 实际数据]                   │
│  │ │ vtable_ptr ─────┼─┼──→ ┌─────────────────┐                 │
│  │ └─────────────────┘ │    │ &Article::summarize │              │
│  └─────────────────────┘    │ &Article::preview   │              │
│                             └─────────────────┘                  │
│  优点: 灵活  缺点: 有运行时开销                                  │
└──────────────────────────────────────────────────────────────────┘
```

| 特性 | 静态分发 | 动态分发 |
|------|---------|---------|
| 语法 | `impl Trait` / `<T: Trait>` | `dyn Trait` |
| 确定时机 | 编译时 | 运行时 |
| 性能 | 零开销（内联） | vtable 间接调用 |
| 代码大小 | 可能膨胀（每种类型一份） | 单份代码 |
| 灵活性 | 返回类型必须单一 | 可返回不同类型 |
| 使用场景 | 性能关键、类型已知 | 异构集合、插件系统 |

---

## Supertrait（超级特征）

一个 trait 可以要求实现者先实现另一个 trait，这叫**supertrait**：

```rust
use std::fmt;

// 要求实现者同时实现 Display
trait Printable: fmt::Display {
    fn print(&self) {
        println!("{}", self);  // 因为有 Display，所以可以用 {}
    }
}

struct Name(String);

impl fmt::Display for Name {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// 只有先实现了 Display，才能实现 Printable
impl Printable for Name {}

fn main() {
    let n = Name(String::from("Rust"));
    n.print(); // Rust
}
```

> 🔑 `trait A: B` 表示"实现 A 之前必须先实现 B"。B 就是 A 的 supertrait。

---

## 常用标准库 Trait

Rust 标准库定义了大量常用 trait，理解它们是写好 Rust 代码的基础：

| Trait | 用途 | 示例 | 可 derive? |
|-------|------|------|-----------|
| `Display` | `{}` 用户友好格式化 | `println!("{}", x)` | ❌ 手动实现 |
| `Debug` | `{:?}` 调试格式化 | `println!("{:?}", x)` | ✅ |
| `Clone` | `.clone()` 深拷贝 | `let b = a.clone()` | ✅ |
| `Copy` | 赋值时隐式复制 | `let b = a`（不 move） | ✅（需先 Clone） |
| `PartialEq` | `==` `!=` 比较 | `a == b` | ✅ |
| `Eq` | 完全等价关系 | 标记 trait，无方法 | ✅（需先 PartialEq） |
| `PartialOrd` | `<` `>` `<=` `>=` | `a < b` | ✅ |
| `Ord` | 全序关系 | `vec.sort()` | ✅（需先 PartialOrd + Eq） |
| `Hash` | 哈希计算 | `HashMap` 的 key | ✅ |
| `Default` | 默认值 | `T::default()` | ✅ |
| `From`/`Into` | 类型转换 | `String::from("hi")` | ❌ 手动实现 |
| `Iterator` | 迭代器 | `for x in iter` | ❌ 手动实现 |

### Display vs Debug

```rust
use std::fmt;

struct Point {
    x: f64,
    y: f64,
}

// Display: 面向用户的格式化，必须手动实现
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// Debug: 面向开发者，可以用 derive 自动生成
impl fmt::Debug for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Point {{ x: {}, y: {} }}", self.x, self.y)
    }
}

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    println!("Display: {}", p);    // Display: (1, 2)
    println!("Debug: {:?}", p);    // Debug: Point { x: 1, y: 2 }
}
```

### Copy 和 Clone 的区别

```rust
#[derive(Debug, Clone, Copy)]
struct Color {
    r: u8,
    g: u8,
    b: u8,
}

fn main() {
    let red = Color { r: 255, g: 0, b: 0 };
    let red2 = red;        // Copy：red 仍然可用！
    let red3 = red.clone(); // Clone：显式深拷贝（Copy 类型效果一样）

    println!("{:?} {:?} {:?}", red, red2, red3); // 三个都能用
}
```

> 💡 `Copy` 是隐式的、按位复制，适用于栈上的小类型（如 `i32`、`bool`、`[u8; 4]`）。
> 包含 `String`、`Vec` 等堆数据的类型**不能** `Copy`，只能 `Clone`。

### From / Into 类型转换

```rust
struct Celsius(f64);
struct Fahrenheit(f64);

impl From<Celsius> for Fahrenheit {
    fn from(c: Celsius) -> Self {
        Fahrenheit(c.0 * 9.0 / 5.0 + 32.0)
    }
}

fn main() {
    let boiling = Celsius(100.0);
    let f: Fahrenheit = boiling.into();  // 自动获得 Into
    println!("100°C = {}°F", f.0);       // 100°C = 212°F

    // 也可以用 From
    let f2 = Fahrenheit::from(Celsius(0.0));
    println!("0°C = {}°F", f2.0);        // 0°C = 32°F
}
```

> 🔑 实现 `From` 会自动获得 `Into`，所以优先实现 `From`。

---

## Derive 宏详解

`#[derive(...)]` 让编译器自动为你的类型生成常用 trait 的实现：

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]
struct Student {
    name: String,
    age: u32,
    grade: char,
}

fn main() {
    // Debug: 可以用 {:?} 打印
    let s1 = Student::default(); // Default: 所有字段用默认值
    let s2 = s1.clone();         // Clone: 深拷贝
    println!("{:?}", s1);        // Student { name: "", age: 0, grade: '\0' }

    // PartialEq: 可以用 == 比较
    assert_eq!(s1, s2);

    // Hash: 可以作为 HashMap 的 key
    use std::collections::HashMap;
    let mut map = HashMap::new();
    map.insert(s1, 95);
}
```

### Derive 的依赖关系

```
Copy  ←  需要先 Clone
Eq    ←  需要先 PartialEq
Ord   ←  需要先 PartialOrd + Eq
```

```rust
// ✅ 正确顺序
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct Version {
    major: u32,
    minor: u32,
    patch: u32,
}
```

---

## 实战示例：Shape 图形系统

下面用一个完整的例子综合展示 trait 的用法：

```rust
use std::fmt;

// 定义 Shape trait
trait Shape: fmt::Display {
    fn area(&self) -> f64;
    fn perimeter(&self) -> f64;
    fn name(&self) -> &str;

    // 默认实现：根据面积和周长描述
    fn describe(&self) -> String {
        format!(
            "{}: 面积={:.2}, 周长={:.2}",
            self.name(),
            self.area(),
            self.perimeter()
        )
    }
}

// 圆形
struct Circle {
    radius: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.radius * self.radius
    }

    fn perimeter(&self) -> f64 {
        2.0 * std::f64::consts::PI * self.radius
    }

    fn name(&self) -> &str {
        "圆形"
    }
}

impl fmt::Display for Circle {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Circle(r={})", self.radius)
    }
}

// 矩形
struct Rectangle {
    width: f64,
    height: f64,
}

impl Shape for Rectangle {
    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }

    fn name(&self) -> &str {
        "矩形"
    }
}

impl fmt::Display for Rectangle {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Rectangle({}×{})", self.width, self.height)
    }
}

// 静态分发：泛型版本
fn print_shape_info<T: Shape>(shape: &T) {
    println!("=== {} ===", shape);
    println!("{}", shape.describe());
}

// 动态分发：trait 对象版本
fn print_shapes(shapes: &[Box<dyn Shape>]) {
    for shape in shapes {
        println!("{}", shape.describe());
    }
}

// 计算总面积
fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    shapes.iter().map(|s| s.area()).sum()
}

fn main() {
    let circle = Circle { radius: 5.0 };
    let rect = Rectangle { width: 4.0, height: 6.0 };

    // 静态分发调用
    print_shape_info(&circle);
    print_shape_info(&rect);

    // 动态分发：异构集合
    let shapes: Vec<Box<dyn Shape>> = vec![
        Box::new(Circle { radius: 3.0 }),
        Box::new(Rectangle { width: 10.0, height: 5.0 }),
        Box::new(Circle { radius: 1.0 }),
    ];

    println!("\n所有图形:");
    print_shapes(&shapes);
    println!("总面积: {:.2}", total_area(&shapes));
}
```

> 💡 注意 `Circle` 和 `Rectangle` 可以放在同一个 `Vec<Box<dyn Shape>>` 里，
> 因为 trait 对象允许在运行时处理不同类型。

---

## 常见陷阱

### 1. 孤儿规则（Orphan Rule）

你只能在以下情况为类型实现 trait：
- **trait 是你定义的**（不管类型是谁的）
- **类型是你定义的**（不管 trait 是谁的）

```rust
// ✅ 合法：Vec 不是你定义的，但 Display 是标准库的
// 等等，Display 也不是你定义的——所以这不行！

// ✅ 合法：MyType 是你定义的
impl std::fmt::Display for MyType { ... }

// ✅ 合法：MyTrait 是你定义的
impl MyTrait for Vec<i32> { ... }

// ❌ 非法：Display 和 Vec 都不是你定义的
impl std::fmt::Display for Vec<i32> { ... }  // 编译错误！
```

> 🔑 孤儿规则防止两个库为同一个类型实现同一个 trait 导致冲突。
> 解决方案：**Newtype 模式**——用元组结构体包装：

```rust
struct Wrapper(Vec<String>);

impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}
```

### 2. 对象安全（Object Safety）

不是所有 trait 都能用作 `dyn Trait`。trait 对象要求 trait 是**对象安全的**：

```rust
// ❌ 不是对象安全的：返回 Self 的方法
trait Clonable {
    fn clone_self(&self) -> Self;  // Self 在编译时大小未知
}

// ❌ 不是对象安全的：泛型方法
trait Converter {
    fn convert<T>(&self) -> T;     // 泛型参数无法动态分发
}

// ✅ 对象安全的
trait Draw {
    fn draw(&self);  // 不返回 Self，没有泛型参数
}
```

> ⚠️ 常见的非对象安全 trait：`Clone`、`Sized`。如果需要在 trait 对象上 clone，
> 可以定义一个 `clone_box(&self) -> Box<dyn Draw>` 方法。

### 3. 忘记添加 Trait Bound

```rust
// ❌ 编译错误：T 没有约束，不能调用 summarize
fn notify<T>(item: &T) {
    println!("{}", item.summarize()); // 错误！T 不一定有 summarize
}

// ✅ 正确：添加 trait bound
fn notify<T: Summary>(item: &T) {
    println!("{}", item.summarize());
}
```

### 4. `impl Trait` 返回类型只能是单一类型

```rust
// ❌ 编译错误
fn create(is_a: bool) -> impl Summary {
    if is_a { Article { ... } } else { Tweet { ... } }
}

// ✅ 用 Box<dyn Trait>
fn create(is_a: bool) -> Box<dyn Summary> { ... }
```

---

## 本章小结

| 概念 | 说明 |
|------|------|
| `trait` | 定义共享行为的接口 |
| `impl Trait for Type` | 为类型实现 trait |
| `impl Trait`（参数） | 语法糖，接受实现了该 trait 的类型 |
| `T: Trait` | trait bound 语法 |
| `T: A + B` | 多重 trait 约束 |
| `where T: A` | where 子句 |
| `impl Trait`（返回） | 静态分发，编译时确定类型 |
| `dyn Trait` | 动态分发，运行时确定类型（trait 对象） |
| `trait A: B` | A 的 supertrait 是 B |
| `#[derive(...)]` | 自动实现常用 trait |

### 练习建议

1. **入门**：定义一个 `Printable` trait，为 `i32`、`String`、`Vec<i32>` 实现它
2. **进阶**：用 trait 对象实现一个简单的命令模式（`Vec<Box<dyn Command>>`）
3. **实战**：为你的项目定义一个 `Serialize` trait，支持 JSON 和 TOML 输出

> 💡 Trait 是 Rust 最强大的特性之一。掌握 trait bound 和 trait 对象的区别，
> 是从"能写 Rust"到"写好 Rust"的关键一步。
