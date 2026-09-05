# 闭包与迭代器

闭包可以捕获环境变量，迭代器优雅地处理序列。两者结合，解锁 Rust 的函数式编程风格。

> 🔑 **核心思想**：闭包让函数"记住"环境，迭代器让数据处理流水线化。

## 闭包基础

闭包是可捕获环境的匿名函数：

```rust
fn main() {
    let add = |a, b| a + b;         // 自动推断类型
    let add = |a: i32, b: i32| -> i32 { a + b };  // 显式标注

    let name = String::from("Rust");
    let greet = || println!("Hello, {}!", name);  // 捕获 name
    greet();
}
```

| 特性 | 函数 `fn` | 闭包 `\|\|` |
|------|----------|------------|
| 捕获环境 | ❌ | ✅ |
| 类型标注 | 必须 | 可选 |
| 语法 | `fn name()` | `\|args\| body` |

## 闭包捕获模式

```
┌──────────────┬─────────────────┬────────────────────────┐
│   &T (借用)   │ &mut T (可变借用) │    move (获取所有权)     │
├──────────────┼─────────────────┼────────────────────────┤
│  只读访问     │  可以修改值       │  所有权转移给闭包         │
│  可多次借用   │  需要 mut 绑定    │  原变量失效              │
│  最常见       │  修改外部变量时    │  跨线程必须              │
└──────────────┴─────────────────┴────────────────────────┘
```

```rust
fn main() {
    // 借用捕获
    let name = String::from("Rust");
    let print_name = || println!("{}", name);
    print_name();
    println!("name 还在: {}", name);  // ✅ 仍可用

    // 可变借用捕获
    let mut count = 0;
    let mut increment = || { count += 1; };
    increment();
    increment();
    println!("count = {}", count);  // 2

    // move 捕获
    let data = vec![1, 2, 3];
    let owns_it = move || println!("{:?}", data);
    owns_it();
    // println!("{:?}", data);  // ❌ 已被 move
}
```

## 三种闭包 Trait

```
Fn ⊂ FnMut ⊂ FnOnce
（最严格）      （最宽松）
```

| Trait | 捕获方式 | 调用次数 | 说明 |
|-------|---------|---------|------|
| `Fn` | `&T` | 无限次 | 只读访问 |
| `FnMut` | `&mut T` | 无限次 | 可修改捕获的值 |
| `FnOnce` | `T`（消耗） | 仅一次 | 转移所有权 |

```rust
fn main() {
    // FnOnce —— 消耗捕获的值
    let s = String::from("hello");
    let consume = || { let _moved = s; };
    consume();
    // consume();  // ❌ 不能再调用

    // FnMut —— 修改捕获的值
    let mut count = 0;
    let mut inc = || { count += 1; };
    inc(); inc();
    println!("count = {}", count);  // 2

    // Fn —— 只读
    let factor = 10;
    let multiply = |x| x * factor;
    println!("{}", multiply(5));   // 50
    println!("{}", multiply(10));  // 100
}
```

## 闭包作为参数与返回值

```rust
// 参数：impl Fn（静态分派，零开销）
fn apply_twice(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    f(f(x))
}

// 返回值：impl Fn
fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x + n
}

// 返回值：Box<dyn Fn>（运行时动态分派，可返回不同闭包）
fn make_op(op: &str) -> Box<dyn Fn(i32, i32) -> i32> {
    match op {
        "add" => Box::new(|a, b| a + b),
        "mul" => Box::new(|a, b| a * b),
        _     => Box::new(|a, b| a - b),
    }
}

fn main() {
    println!("{}", apply_twice(|x| x + 3, 10));  // 16
    println!("{}", make_adder(5)(10));            // 15
    println!("{}", make_op("mul")(3, 4));         // 12
}
```

> ⚠️ **`impl Fn` vs `Box<dyn Fn>`**：前者零开销但只能返回同一种闭包，
> 后者有堆分配开销但可以运行时选择不同闭包。

## move 闭包与线程

线程可能比主线程活得久，必须用 `move` 确保闭包拥有数据：

```rust
use std::thread;

fn main() {
    let name = String::from("Rust");
    let handle = thread::spawn(move || {
        println!("Hello, {}!", name);
    });
    // println!("{}", name);  // ❌ name 已 move 到子线程
    handle.join().unwrap();
}
```

## 迭代器基础

迭代器实现了 `Iterator` trait，核心是 `next()` 方法：

```rust
fn main() {
    let v = vec![10, 20, 30];
    let mut iter = v.iter();
    println!("{:?}", iter.next());  // Some(10)
    println!("{:?}", iter.next());  // Some(20)
    println!("{:?}", iter.next());  // Some(30)
    println!("{:?}", iter.next());  // None
}
```

### 三种迭代方式

```
┌──────────────┬─────────────────┬────────────────────────┐
│  .iter()     │  .iter_mut()    │  .into_iter()          │
├──────────────┼─────────────────┼────────────────────────┤
│  产出 &T     │  产出 &mut T     │  产出 T（获取所有权）     │
│  不消耗集合   │  可修改元素       │  消耗集合               │
└──────────────┴─────────────────┴────────────────────────┘
```

```rust
fn main() {
    let mut v = vec![1, 2, 3];

    for val in v.iter() { print!("{} ", val); }     // 不可变引用
    for val in v.iter_mut() { *val *= 10; }          // 可变引用
    for val in v { print!("{} ", val); }              // 消耗 v
}
```

## 适配器（惰性求值）

适配器返回新迭代器，不调用消费者就不执行：

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // map —— 转换元素
    let doubled: Vec<i32> = v.iter().map(|&x| x * 2).collect();

    // filter —— 筛选（注意闭包参数是 &&i32）
    let evens: Vec<&i32> = v.iter().filter(|&&x| x % 2 == 0).collect();

    // enumerate —— 带索引
    for (i, val) in v.iter().enumerate() {
        println!("{}: {}", i, val);
    }

    // zip —— 合并两个迭代器
    let names = vec!["Alice", "Bob"];
    let ages = vec![25, 30];
    let people: Vec<_> = names.iter().zip(ages.iter()).collect();

    // take / skip —— 取前 N 个 / 跳过前 N 个
    let first3: Vec<&i32> = v.iter().take(3).collect();
    let skip5: Vec<&i32> = v.iter().skip(5).collect();

    // chain —— 连接
    let a = vec![1, 2]; let b = vec![3, 4];
    let c: Vec<&i32> = a.iter().chain(b.iter()).collect();

    // 链式组合
    let result: Vec<i32> = v.iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| x * x)
        .take(3)
        .collect();
    // [4, 16, 36]
}
```

## 消费者（触发求值）

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    let sum: i32 = v.iter().sum();                    // 15
    let count = v.iter().count();                      // 5
    let max = v.iter().max();                          // Some(5)
    let has_even = v.iter().any(|&x| x % 2 == 0);     // true
    let all_pos = v.iter().all(|&x| x > 0);           // true
    let first_even = v.iter().find(|&&x| x % 2 == 0); // Some(2)
    let pos = v.iter().position(|&x| x == 3);          // Some(2)

    // fold —— 最通用的归约
    let product = v.iter().fold(1, |acc, &x| acc * x); // 120
}
```

## 自定义迭代器

实现 `Iterator` trait 即可创建自定义迭代器：

```rust
struct Fibonacci { a: u64, b: u64 }

impl Fibonacci {
    fn new() -> Self { Fibonacci { a: 0, b: 1 } }
}

impl Iterator for Fibonacci {
    type Item = u64;
    fn next(&mut self) -> Option<Self::Item> {
        let result = self.a;
        self.a = self.b;
        self.b = result + self.b;
        Some(result)
    }
}

fn main() {
    let fibs: Vec<u64> = Fibonacci::new().take(10).collect();
    println!("{:?}", fibs);  // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
}
```

> 🔑 自定义迭代器要点：1) 定义状态结构体 2) 实现 `Iterator` trait 3) `next()` 返回 `Some` 或 `None`

## 性能：零成本抽象

编译器将迭代器链优化为等价手写循环，无中间集合，无函数调用开销：

```rust
fn main() {
    let v: Vec<i32> = (0..1_000_000).collect();

    // 编译后与手写循环性能相同
    let sum: i32 = v.iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| x * x)
        .sum();
}
```

## 常见陷阱

### 陷阱 1：迭代器是惰性的

```rust
fn main() {
    let v = vec![1, 2, 3];

    // ⚠️ 什么都不会发生！没有消费者
    v.iter().map(|x| { println!("{}", x); x * 2 });

    // ✅ 加上 collect 才触发执行
    let _: Vec<i32> = v.iter().map(|&x| { println!("{}", x); x * 2 }).collect();
}
```

### 陷阱 2：collect 需要类型标注

```rust
fn main() {
    let v = vec![1, 2, 3];
    let result: Vec<i32> = v.iter().map(|&x| x * 2).collect();      // 标注类型
    let result = v.iter().map(|&x| x * 2).collect::<Vec<i32>>();    // turbofish
}
```

### 陷阱 3：迭代时不能修改集合

```rust
fn main() {
    let mut v = vec![1, 2, 3];
    let has_two = v.iter().any(|&x| x == 2);
    if has_two { v.push(4); }  // ✅ 先收集信息，再修改
}
```

## 实战：CSV 解析器

```rust
fn parse_csv_line(line: &str) -> Vec<String> {
    line.split(',')
        .map(|f| f.trim())
        .map(|f| {
            if f.starts_with('"') && f.ends_with('"') { &f[1..f.len()-1] }
            else { f }
        })
        .map(String::from)
        .collect()
}

fn main() {
    let csv = "Name,Score\nAlice,95\nBob,78\nCharlie,89";

    // 提取分数并计算平均值
    let scores: Vec<f64> = csv.lines()
        .skip(1)
        .filter_map(|line| {
            let fields = parse_csv_line(line);
            fields.get(1)?.parse::<f64>().ok()
        })
        .collect();

    let avg = scores.iter().sum::<f64>() / scores.len() as f64;
    println!("平均分: {:.1}", avg);  // 87.3

    // 找最高分
    let best = csv.lines()
        .skip(1)
        .filter_map(|line| {
            let fields = parse_csv_line(line);
            Some((fields.first()?.clone(), fields.get(1)?.parse::<f64>().ok()?))
        })
        .reduce(|a, b| if b.1 > a.1 { b } else { a });

    println!("最高分: {:?}", best);  // Some(("Alice", 95.0))
}
```

## 本章小结

| 概念 | 说明 |
|------|------|
| `\|args\| body` | 闭包语法 |
| `Fn / FnMut / FnOnce` | 三种闭包 trait |
| `move` | 强制获取所有权 |
| `impl Fn` / `Box<dyn Fn>` | 闭包作为参数/返回值 |
| `.iter()` / `.iter_mut()` / `.into_iter()` | 三种迭代方式 |
| `.map()` / `.filter()` / `.enumerate()` | 适配器（惰性） |
| `.zip()` / `.take()` / `.skip()` / `.chain()` | 更多适配器 |
| `.collect()` / `.sum()` / `.fold()` | 消费者（触发求值） |
| `impl Iterator` | 自定义迭代器 |

## 练习建议

1. **从简单开始**：先练 `map` + `filter` + `collect` 组合
2. **注意类型**：`collect()` 经常需要类型标注
3. **理解惰性**：没有消费者就不执行
4. **善用 fold**：需要"遍历并累积"时，`fold` 几乎总能解决
5. **写自定义迭代器**：实现 `Iterator` trait 加深理解
