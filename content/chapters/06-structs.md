# 结构体（Structs）

## 为什么需要结构体？

想象你在填一张「学生信息登记表」——表上写着姓名、年龄、成绩等字段。在代码里，我们经常需要把一组相关的数据绑在一起：

- 一个用户：用户名 + 邮箱 + 年龄
- 一个矩形：宽度 + 高度
- 一个坐标点：x + y

用单独的变量（`let name = ...; let age = ...;`）会散落一地，传参时要带一长串。**结构体就是数据的「表格模板」**——定义一次字段，到处复用。

> 🔑 **结构体 = 字段的命名集合。** 它是 Rust 中组织数据的基本方式，类似 C 的 `struct` 或 Python 的 `class`（但没有继承）。

## 定义和实例化

```rust
struct User {
    username: String,   // 字段名: 类型
    email: String,
    age: u32,
    active: bool,
}

fn main() {
    let user1 = User {
        username: String::from("alice"),
        email: String::from("alice@example.com"),
        age: 25,
        active: true,
    };
    println!("{} 的年龄是 {}", user1.username, user1.age);
}
```

> ⚠️ 创建实例时**必须给所有字段赋值**，不能漏掉任何一个。

## 内存布局

结构体实例通常分配在**栈**上，字段按声明顺序紧密排列：

```
user1（栈）                    堆
┌──────────────────────────┐
│ username │ → "alice"      │
│ email    │ → "alice@..."  │
│ age      │ 25             │
│ active   │ true           │
└──────────────────────────┘
```

`String` 字段在栈上存的是胖指针（指针+长度+容量），实际内容在堆上。`u32`、`bool` 等固定大小类型直接存在栈上。

## 可变性

Rust 不允许只把某个字段标记为可变——要么**整个实例**可变，要么**整个实例**不可变：

```rust
fn main() {
    let mut user = User {
        username: String::from("alice"),
        email: String::from("alice@example.com"),
        age: 25,
        active: true,
    };
    user.age = 26;        // ✅ 整个实例是 mut
    user.email = String::from("new@example.com"); // ✅
}
```

## 字段初始化简写

变量名和字段名**相同**时可省略：

```rust
fn build_user(username: String, email: String) -> User {
    User {
        username,     // 等同于 username: username
        email,        // 等同于 email: email
        age: 0,
        active: true,
    }
}
```

## 结构体更新语法（`..`）

基于已有实例创建新实例，只改部分字段：

```rust
fn main() {
    let user1 = User {
        username: String::from("alice"),
        email: String::from("alice@example.com"),
        age: 25,
        active: true,
    };

    let user2 = User {
        email: String::from("bob@example.com"),
        ..user1  // 其余字段从 user1 复制或移动
    };
}
```

> ⚠️ **部分移动**：`..user1` 会移动 `String` 字段，之后 `user1.username` 不可再用。但 `u32`、`bool` 实现了 `Copy`，不受影响。

## 元组结构体

给元组起个名字，让它成为独立类型：

```rust
struct Color(u8, u8, u8);    // RGB 颜色
struct Point(f64, f64);      // 二维坐标

fn main() {
    let red = Color(255, 0, 0);
    let origin = Point(0.0, 0.0);
    println!("R={}", red.0);      // 用 .0 .1 .2 访问
    println!("x={}", origin.0);
}
```

> 🔑 `Color(255,0,0)` 和 `(255,0,0)` 是**不同类型**，不能混用。这就是「新类型模式」的基础。

## 单元结构体

没有任何字段：

```rust
struct Marker;

fn main() {
    let _m = Marker;
}
```

> 💡 本身没有数据，但可以为它实现 trait，后面会看到用处。

## 方法：`impl` 块

```rust
struct Rectangle {
    width: f64,
    height: f64,
}

impl Rectangle {
    // 方法：第一个参数是 &self
    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }

    // 可变方法：需要修改自身
    fn scale(&mut self, factor: f64) {
        self.width *= factor;
        self.height *= factor;
    }
}

fn main() {
    let mut rect = Rectangle { width: 10.0, height: 5.0 };
    println!("面积 = {}", rect.area());       // 50.0
    rect.scale(2.0);
    println!("缩放后面积 = {}", rect.area()); // 200.0
}
```

### `self` 参数的三种写法

| 写法 | 含义 | 何时使用 |
|------|------|---------|
| `&self` | 不可变借用（只读） | 只需要读取数据 |
| `&mut self` | 可变借用（可修改） | 需要修改自身 |
| `self` | 获取所有权（消耗实例） | 转换或销毁实例 |

> 🔑 90% 的方法用 `&self`，因为它不消耗实例，可以反复调用。

## 关联函数

在 `impl` 块中，**不以 `self` 为第一个参数**的函数叫关联函数——类似静态方法或构造器：

```rust
impl Rectangle {
    fn new(width: f64, height: f64) -> Rectangle {
        Rectangle { width, height }
    }

    fn square(size: f64) -> Rectangle {
        Rectangle { width: size, height: size }
    }
}

fn main() {
    let r = Rectangle::new(10.0, 5.0);  // 用 :: 调用
    let sq = Rectangle::square(3.0);
    println!("{}, {}", r.area(), sq.area());
}
```

> 💡 `String::from("hello")` 就是一个关联函数！约定俗成用 `new` 作构造器名称。

## 多个 `impl` 块

一个结构体可以有**多个** `impl` 块，效果和写在一起完全一样：

```rust
impl Rectangle {
    fn area(&self) -> f64 { self.width * self.height }
}

impl Rectangle {  // 和上面的块等价于合并
    fn perimeter(&self) -> f64 { 2.0 * (self.width + self.height) }
}
```

> 💡 后面学 **trait** 时，为结构体实现不同 trait 会自然产生多个 `impl` 块。

## Debug trait：让结构体可打印

```rust
#[derive(Debug)]  // ← 自动实现 Debug
struct Point { x: f64, y: f64 }

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    println!("{:?}", p);    // Point { x: 1.0, y: 2.0 }
    println!("{:#?}", p);   // 美化版（换行缩进）
}
```

> 🔑 **新手第一坑**：忘记加 `#[derive(Debug)]`，然后对着编译错误发呆。记住：想打印结构体，第一件事就是加这行。

### 其他常用 derive

```rust
#[derive(Debug, Clone, PartialEq)]
struct Point { x: f64, y: f64 }
```

| derive | 作用 | 何时需要 |
|--------|------|---------|
| `Debug` | 调试打印 `{:?}` | 几乎总是需要 |
| `Clone` | 深拷贝 `.clone()` | 需要复制实例时 |
| `PartialEq` | `==` 比较 | 需要比较两个实例是否相等 |

## 常见陷阱

### 陷阱 1：忘记 `#[derive(Debug)]`

```rust
struct Point { x: f64, y: f64 }
fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    // println!("{:?}", p);  // ❌ Point 没有实现 Debug
}
```

### 陷阱 2：结构体更新语法的移动问题

```rust
fn main() {
    let u1 = User {
        username: String::from("alice"),
        email: String::from("a@b.com"),
        age: 25,
        active: true,
    };
    let u2 = User {
        email: String::from("c@d.com"),
        ..u1           // username 被 move 了
    };
    // println!("{}", u1.username); // ❌ 已移动
    println!("{}", u1.age);         // ✅ i32 是 Copy
}
```

### 陷阱 3：借用冲突

```rust
fn main() {
    let mut r = Rectangle { width: 10.0, height: 5.0 };
    let w = &r.width;       // 不可变借用
    // r.width = 20.0;      // ❌ 有不可变借用时不能修改
    println!("{}", w);
    r.width = 20.0;         // ✅ w 的借用已结束
}
```

> ⚠️ 同一时刻不能同时存在可变和不可变引用——和第 4 章的借用规则完全一致。

## 实战：学生成绩管理

```rust
#[derive(Debug)]
struct Student {
    name: String,
    scores: Vec<f64>,
}

impl Student {
    fn new(name: &str) -> Student {
        Student { name: String::from(name), scores: Vec::new() }
    }

    fn add_score(&mut self, score: f64) {
        self.scores.push(score);
    }

    fn average(&self) -> f64 {
        if self.scores.is_empty() { return 0.0; }
        let sum: f64 = self.scores.iter().sum();
        sum / self.scores.len() as f64
    }

    fn is_passing(&self) -> bool {
        self.average() >= 60.0
    }

    fn report(&self) {
        println!("=== {} 的成绩单 ===", self.name);
        for (i, score) in self.scores.iter().enumerate() {
            println!("  第{}门: {:.1}", i + 1, score);
        }
        println!("  平均分: {:.1}", self.average());
        println!("  状态: {}", if self.is_passing() { "✅ 及格" } else { "❌ 不及格" });
    }
}

fn main() {
    let mut alice = Student::new("Alice");
    alice.add_score(85.0);
    alice.add_score(92.0);
    alice.add_score(78.0);
    alice.report();

    println!();

    let mut bob = Student::new("Bob");
    bob.add_score(55.0);
    bob.add_score(48.0);
    bob.add_score(63.0);
    bob.report();
}
```

运行结果：

```
=== Alice 的成绩单 ===
  第1门: 85.0
  第2门: 92.0
  第3门: 78.0
  平均分: 85.0
  状态: ✅ 及格

=== Bob 的成绩单 ===
  第1门: 55.0
  第2门: 48.0
  第3门: 63.0
  平均分: 55.3
  状态: ❌ 不及格
```

## 本章小结

| 概念 | 说明 | 示例 |
|------|------|------|
| `struct` | 定义命名字段的结构体 | `struct User { name: String }` |
| 元组结构体 | 无字段名的结构体 | `struct Color(u8, u8, u8)` |
| 单元结构体 | 没有字段的结构体 | `struct Marker;` |
| `impl` | 定义方法和关联函数 | `impl Rect { fn area(&self) ... }` |
| `&self` / `&mut self` / `self` | 方法的三种 self 写法 | 见 self 参数表 |
| `::` | 调用关联函数 | `Rect::new(10.0, 5.0)` |
| `..other` | 结构体更新语法 | `User { email: .., ..u1 }` |
| `#[derive(Debug)]` | 自动调试打印 | 几乎所有结构体都需要 |

## 练习建议

1. **跟着敲代码**：把每个示例自己输入一遍，观察编译器的报错信息
2. **故意犯错**：删掉 `#[derive(Debug)]` 看报错，用已 move 的变量看报错——编译器是最好的老师
3. **改造项目**：给 `Student` 加一个 `highest()` 方法返回最高分，加一个 `grade()` 方法返回等级（A/B/C/D/F）
4. **对比语言**：想想 Python 里用 `class` 做同样的事需要多少行，Rust 的结构体少了什么（继承），多了什么（编译期安全）

> 🔑 结构体是 Rust 面向数据编程的起点。下一章我们会学习**枚举**——当数据有多种「形状」时，枚举比结构体更合适。
