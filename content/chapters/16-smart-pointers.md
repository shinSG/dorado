# 智能指针

## 为什么需要智能指针？

前面学了所有权系统：每个值一个所有者，离开作用域自动释放。但有些场景需要更灵活：

- **堆上分配数据**（而非栈上）
- **多个变量共享同一份数据**
- **编译时未知大小的类型**（如递归数据结构）

智能指针是拥有**额外元数据和能力**的数据结构，拥有它指向的数据，丢弃时自动清理。

> 🔑 智能指针 = 指针 + 拥有权 + 自动清理

```
普通引用 (&T)          智能指针 (Box<T>)
┌──────────┐           ┌──────────────────┐
│ 地址     │──────────▶│ 堆上的数据       │
└──────────┘           └──────────────────┘
  不拥有数据            拥有 + 额外元数据
```

| 智能指针 | 用途 | 所有权模型 |
|----------|------|------------|
| `Box<T>` | 堆分配 | 单一所有者 |
| `Rc<T>` | 引用计数共享 | 多个（单线程） |
| `Arc<T>` | 原子引用计数 | 多个（多线程） |
| `Weak<T>` | 弱引用 | 不拥有数据 |

---

## Box\<T\> — 堆分配

最简单的智能指针：堆上分配数据，栈上只留一个指针。

```rust
fn main() {
    let b = Box::new(5);   // 5 分配到堆上
    println!("b = {}", b); // 自动解引用
}
```

```
栈 (Stack)                  堆 (Heap)
┌─────────────┐            ┌───────────┐
│ b           │            │           │
│ ┌─────────┐ │   指向     │     5     │
│ │ 地址    │─┼───────────▶│           │
│ └─────────┘ │            └───────────┘
└─────────────┘
```

### 递归类型

编译器需要知道类型大小，递归类型必须用 `Box` 固定大小：

```rust
enum List {
    Cons(i32, Box<List>),  // Box<List> 指针大小固定 8 字节
    Nil,
}

fn main() {
    let list = List::Cons(1,
        Box::new(List::Cons(2,
            Box::new(List::Cons(3,
                Box::new(List::Nil))))));
    // [1|ptr]──▶[2|ptr]──▶[3|ptr]──▶Nil
}
```

### trait 对象

集合存储不同类型时，用 `Box<dyn Trait>`：

```rust
trait Animal { fn speak(&self) -> &str; }
struct Dog;
struct Cat;
impl Animal for Dog { fn speak(&self) -> &str { "汪汪！" } }
impl Animal for Cat { fn speak(&self) -> &str { "喵喵！" } }

fn main() {
    let animals: Vec<Box<dyn Animal>> = vec![Box::new(Dog), Box::new(Cat)];
    for a in &animals { println!("{}", a.speak()); }
}
```

> 🔑 `Box<dyn Trait>` 通过**动态分发**（vtable）在运行时调用方法。

---

## Deref Trait — 自定义解引用

`Deref` 让智能指针像普通引用一样使用：

```rust
use std::ops::Deref;
struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> { MyBox(x) }
}

impl<T> Deref for MyBox<T> {
    type Target = T;
    fn deref(&self) -> &T { &self.0 }
}

fn main() {
    let x = MyBox::new(5);
    assert_eq!(5, *x);  // *x 是 *(x.deref()) 的语法糖
}
```

### 解引用强制转换

Rust 自动插入 `deref()` 调用，链式转换直到匹配目标类型：

```rust
fn hello(name: &str) { println!("Hello, {}!", name); }

fn main() {
    let s = MyBox::new(String::from("Rust"));
    hello(&s);  // &MyBox<String> → &String → &str，自动转换
}
```

> 💡 规则：`&T → &U` 当 `T: Deref<Target=U>`，可连续多步。

---

## Drop Trait — 自定义清理

值被丢弃时执行自定义逻辑（类似析构函数）：

```rust
struct DbConn { name: String }

impl Drop for DbConn {
    fn drop(&mut self) {
        println!("关闭连接: {}", self.name);
    }
}

fn main() {
    let c1 = DbConn { name: String::from("主库") };
    let c2 = DbConn { name: String::from("从库") };
    // c2 先 drop，c1 后 drop（逆序释放）
}
```

> 🔑 Rust 按**创建的逆序**调用 drop，保证依赖关系正确。

有时不想等到作用域结束（如释放锁），用 `std::mem::drop` 提前释放：

```rust
fn main() {
    let s = String::from("hello");
    drop(s);  // 拿走所有权，提前释放
}
```

> ⚠️ 不能直接调用 `.drop()`，必须用 `std::mem::drop`。

---

## Rc\<T\> — 引用计数

多个变量共享同一份数据，通过引用计数管理生命周期：

```rust
use std::rc::Rc;

fn main() {
    let a = Rc::new(String::from("共享数据"));  // 计数 = 1
    let b = Rc::clone(&a);                      // 计数 = 2
    let c = Rc::clone(&a);                      // 计数 = 3
    println!("计数: {}", Rc::strong_count(&a));  // 3
    drop(c);  // 计数 = 2
}
```

```
栈 (Stack)              堆 (Heap)
┌──────────┐           ┌─────────────────┐
│ a ──┐    │           │ RcBox           │
├─────┼────┤           │ strong_count: 3 │
│ b ──┼──┐ │   指向    │ weak_count:  0  │
├─────┼──┼─┼──────────▶│ data: "共享数据" │
│ c ──┼──┘ │           └─────────────────┘
└─────┘────┘
```

> 💡 社区惯例：**总是 `Rc::clone(&a)`** 而非 `a.clone()`，一眼看出只增加计数。

### 可变共享：Rc + RefCell

`Rc<T>` 只提供不可变访问，结合 `RefCell<T>` 实现可变共享：

```rust
use std::rc::Rc;
use std::cell::RefCell;

fn main() {
    let shared = Rc::new(RefCell::new(vec![1, 2, 3]));
    shared.borrow_mut().push(4);  // 运行时借用检查
    println!("{:?}", shared.borrow());  // [1, 2, 3, 4]
}
```

> ⚠️ `RefCell` 借用检查在**运行时**执行，违反规则会 **panic**。

---

## 循环引用与 Weak\<T\>

如果 `a → b → a` 形成循环，`strong_count` 永远 ≥ 1，内存永不释放。用 `Weak<T>` 打破循环：

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,       // 弱引用 → 父节点
    children: RefCell<Vec<Rc<Node>>>,  // 强引用 → 子节点
}

fn main() {
    let leaf = Rc::new(Node {
        value: 3,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![]),
    });

    {
        let branch = Rc::new(Node {
            value: 5,
            parent: RefCell::new(Weak::new()),
            children: RefCell::new(vec![Rc::clone(&leaf)]),
        });
        *leaf.parent.borrow_mut() = Rc::downgrade(&branch);

        if let Some(p) = leaf.parent.borrow().upgrade() {
            println!("父节点: {}", p.value);  // 5
        }
    } // branch 释放

    assert!(leaf.parent.borrow().upgrade().is_none());  // 数据已释放
}
```

> 🔑 `Weak::upgrade()` 返回 `Option<Rc<T>>`：数据在则 `Some`，已释放则 `None`。

---

## Arc\<T\> — 线程安全的引用计数

`Rc` 的引用计数不是原子的，多线程下不安全。`Arc` 用原子操作保证安全：

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3]);
    let mut handles = vec![];
    for i in 0..3 {
        let d = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            println!("线程 {}: {:?}", i, d);
        }));
    }
    for h in handles { h.join().unwrap(); }
}
```

> 💡 `Rc` 不是 `Send`，编译器拒绝跨线程。`Arc` 既是 `Send` 也是 `Sync`。

```
Rc::clone  → 普通内存加法，极快
Arc::clone → 原子加法 + 内存屏障，较慢

单线程 → Rc（更快）   多线程 → Arc（必须）
```

---

## 常见陷阱

```rust
// 陷阱 1：循环引用
// ❌ 双向都用 Rc → 内存泄漏
// ✅ 一个方向用 Weak 打破循环

// 陷阱 2：过度 Box
// ❌ fn add(x: Box<i32>) -> Box<i32> { Box::new(*x + 1) }
// ✅ fn add(x: i32) -> i32 { x + 1 }

// 陷阱 3：单线程用 Arc
// ❌ 单线程用 Arc — 不必要的原子操作开销
// ✅ 单线程用 Rc，多线程才用 Arc
```

---

## 何时使用哪个？

```
需要智能指针？
├─ 堆分配 / 递归类型 / trait 对象 → Box<T>
├─ 多个所有者？
│  ├─ 单线程 → Rc<T>（可变用 Rc<RefCell<T>>）
│  └─ 多线程 → Arc<T>（可变用 Arc<Mutex<T>>）
└─ 打破循环引用 → Weak<T>
```

---

## 实战：双向树结构

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

#[derive(Debug)]
struct TreeNode {
    value: i32,
    parent: RefCell<Weak<TreeNode>>,
    children: RefCell<Vec<Rc<TreeNode>>>,
}

impl TreeNode {
    fn new(value: i32) -> Rc<TreeNode> {
        Rc::new(TreeNode {
            value,
            parent: RefCell::new(Weak::new()),
            children: RefCell::new(vec![]),
        })
    }

    fn add_child(parent: &Rc<TreeNode>, child: &Rc<TreeNode>) {
        *child.parent.borrow_mut() = Rc::downgrade(parent);
        parent.children.borrow_mut().push(Rc::clone(child));
    }

    fn display(node: &Rc<TreeNode>, depth: usize) {
        let indent = "  ".repeat(depth);
        println!("{}├─ 值: {}", indent, node.value);
        if let Some(p) = node.parent.borrow().upgrade() {
            println!("{}   (父: {})", indent, p.value);
        }
        for child in node.children.borrow().iter() {
            Self::display(child, depth + 1);
        }
    }
}

fn main() {
    let root = TreeNode::new(1);
    let c1 = TreeNode::new(2);
    let c2 = TreeNode::new(3);
    let gc = TreeNode::new(4);
    TreeNode::add_child(&root, &c1);
    TreeNode::add_child(&root, &c2);
    TreeNode::add_child(&c1, &gc);
    TreeNode::display(&root, 0);
}
```

---

## 本章小结

| 类型 | 用途 | 所有权 | 线程安全 |
|------|------|--------|----------|
| `Box<T>` | 堆分配 | 单一 | ✅ |
| `Rc<T>` | 共享所有权 | 多个 | ❌ |
| `Arc<T>` | 原子共享 | 多个 | ✅ |
| `Weak<T>` | 弱引用 | 无 | 配合 Rc |
| `RefCell<T>` | 内部可变性 | 单一 | ❌ |

| Trait | 作用 |
|-------|------|
| `Deref` | 自定义 `*` 解引用，支持强制转换 |
| `Drop` | 自定义析构，释放资源 |
| `Send` | 可跨线程发送 |
| `Sync` | 可跨线程共享引用 |

### 练习建议

1. 为自定义类型实现 `Deref` 和 `Drop`
2. 画出 `Rc<RefCell<T>>` 的内存布局图
3. 用 `Weak<T>` 修复一个循环引用的代码
4. 用 `Arc<Mutex<T>>` 实现多线程共享计数器
5. 阅读标准库中 `Box`、`Rc`、`Arc` 的源码

> 💡 智能指针不是魔法，它们只是实现了 `Deref` 和 `Drop` 的普通类型。理解这两个 trait，就理解了 90%。
