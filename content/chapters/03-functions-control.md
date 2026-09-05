# 函数与控制流

## 定义函数

```rust
fn greet() {
    println!("Hello!");
}

fn main() {
    greet();  // 调用函数
}
```

### 带参数的函数

```rust
fn greet(name: &str) {
    println!("Hello, {}!", name);
}

fn add(a: i32, b: i32) {
    println!("{} + {} = {}", a, b, a + b);
}

fn main() {
    greet("Rust");
    add(3, 5);
}
```

> ⚠️ Rust 中**必须**标注参数类型，编译器不会推导函数参数类型。

### 返回值

```rust
// 方式 1：用 return 显式返回
fn add_v1(a: i32, b: i32) -> i32 {
    return a + b;
}

// 方式 2：最后一个表达式作为返回值（推荐）
fn add_v2(a: i32, b: i32) -> i32 {
    a + b  // ⚠️ 没有分号！有分号就变成语句了
}

fn main() {
    let sum = add_v2(3, 5);
    println!("sum = {}", sum);
}
```

> 🔑 **表达式 vs 语句**：表达式有返回值（如 `a + b`），语句没有（如 `let x = 5;`）。最后一个表达式不加分号就是返回值。

### 表达式无处不在

```rust
fn main() {
    // if 是表达式，可以赋值
    let condition = true;
    let number = if condition { 5 } else { 6 };
    println!("number = {}", number);  // 5

    // 花括号块也是表达式
    let y = {
        let x = 3;
        x + 1  // 没有分号 → 这是返回值
    };
    println!("y = {}", y);  // 4
}
```

## 控制流

### if / else

```rust
fn main() {
    let number = 7;

    if number > 5 {
        println!("大于 5");
    } else if number > 3 {
        println!("大于 3 但不大于 5");
    } else {
        println!("不大于 3");
    }
}
```

> ⚠️ 条件**不需要**加括号（和 C/Java 不同），但加了也不报错。类型必须是 `bool`。

```rust
fn main() {
    let number = 3;
    // if number { ... }  // ❌ expected `bool`, found integer
    if number != 0 {       // ✅
        println!("非零");
    }
}
```

### match 表达式

`match` 是 Rust 的模式匹配，比 `switch` 强大得多：

```rust
fn main() {
    let number = 3;

    match number {
        1 => println!("一"),
        2 => println!("二"),
        3 => println!("三"),
        _ => println!("其他"),  // _ 是通配符，匹配所有
    }
}
```

`match` 也是表达式：

```rust
fn main() {
    let number = 2;
    let text = match number {
        1 => "一",
        2 => "二",
        3 => "三",
        _ => "其他",
    };
    println!("{}", text);
}
```

> ⚠️ `match` 必须**穷尽**所有可能，否则编译错误。用 `_` 兜底。

### 匹配多个值和范围

```rust
fn main() {
    let x = 5;

    match x {
        1 | 2 => println!("一或二"),     // 多个值用 |
        3..=5 => println!("三到五"),      // 范围用 ..=
        6..=10 => println!("六到十"),
        _ => println!("其他"),
    }
}
```

## 循环

### loop — 无限循环

```rust
fn main() {
    let mut count = 0;

    let result = loop {
        count += 1;
        if count == 10 {
            break count * 2;  // break 可以带返回值！
        }
    };

    println!("result = {}", result);  // 20
}
```

### while 循环

```rust
fn main() {
    let mut number = 3;

    while number != 0 {
        println!("{}!", number);
        number -= 1;
    }
    println!("发射！");
}
```

### for 循环

```rust
fn main() {
    // 遍历数组
    let arr = [10, 20, 30, 40, 50];
    for element in arr {
        println!("值: {}", element);
    }

    // 遍历范围
    for i in 1..=5 {      // 1, 2, 3, 4, 5
        println!("i = {}", i);
    }

    for i in 0..5 {       // 0, 1, 2, 3, 4（不包含 5）
        println!("i = {}", i);
    }

    // 反转
    for i in (1..=5).rev() {
        println!("倒数: {}", i);  // 5, 4, 3, 2, 1
    }

    // 带索引
    let fruits = ["苹果", "香蕉", "橘子"];
    for (index, fruit) in fruits.iter().enumerate() {
        println!("{}. {}", index + 1, fruit);
    }
}
```

### 循环标签与 break/continue

```rust
fn main() {
    // 嵌套循环 + 标签
    'outer: for i in 0..5 {
        for j in 0..5 {
            if i + j > 4 {
                break 'outer;  // 跳出外层循环
            }
            println!("({}, {})", i, j);
        }
    }

    // continue 跳过当前迭代
    for i in 1..=10 {
        if i % 3 == 0 {
            continue;  // 跳过 3 的倍数
        }
        println!("{}", i);
    }
}
```

## 综合示例：FizzBuzz

经典面试题，用 Rust 的 `match` 优雅实现：

```rust
fn main() {
    for i in 1..=30 {
        match (i % 3, i % 5) {
            (0, 0) => println!("FizzBuzz"),
            (0, _) => println!("Fizz"),
            (_, 0) => println!("Buzz"),
            _ => println!("{}", i),
        }
    }
}
```

### 对比其他语言

```python
# Python 版
for i in range(1, 31):
    if i % 15 == 0: print("FizzBuzz")
    elif i % 3 == 0: print("Fizz")
    elif i % 5 == 0: print("Buzz")
    else: print(i)
```

Rust 的 `match` + 元组模式更简洁、更不容易出错。

## 函数进阶

### 多返回值（用元组）

```rust
fn swap(a: i32, b: i32) -> (i32, i32) {
    (b, a)
}

fn divide(dividend: i32, divisor: i32) -> (i32, i32) {
    (dividend / divisor, dividend % divisor)
}

fn main() {
    let (x, y) = swap(1, 2);
    println!("x={}, y={}", x, y);  // x=2, y=1

    let (quotient, remainder) = divide(17, 5);
    println!("17 ÷ 5 = {} 余 {}", quotient, remainder);  // 3 余 2
}
```

### 提前返回

```rust
fn check_age(age: i32) -> &'static str {
    if age < 0 {
        return "年龄不能为负";  // 提前返回
    }
    if age < 18 {
        return "未成年";
    }
    "成年"  // 最后一个表达式，不需要 return
}

fn main() {
    println!("{}", check_age(25));  // 成年
    println!("{}", check_age(-1));  // 年龄不能为负
}
```

## 常见错误

### 1. 返回值加分号

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b;  // ❌ 加了分号变成语句，返回 ()
}
```

### 2. if 条件不是 bool

```rust
fn main() {
    let x = 5;
    // if x { ... }  // ❌ 类型不匹配
    if x > 0 {       // ✅ 比较表达式返回 bool
        println!("正数");
    }
}
```

### 3. match 没有穷尽

```rust
fn main() {
    let x = 42;
    match x {
        1 => println!("一"),
        2 => println!("二"),
        // ❌ 非穷尽模式，缺少 _ 分支
    }
}
```

## 本章小结

| 概念 | 说明 |
|------|------|
| `fn name(params) -> RetType` | 函数定义 |
| 表达式 vs 语句 | 表达式有返回值，语句没有 |
| `if / else` | 条件分支，不需要括号 |
| `match` | 模式匹配，必须穷尽 |
| `loop` | 无限循环，`break` 可返回值 |
| `while` | 条件循环 |
| `for in` | 迭代循环（最常用） |
| `'label` | 循环标签，用于嵌套循环控制 |

**下一步**：学习 Rust 最核心的概念 — 所有权系统 →
