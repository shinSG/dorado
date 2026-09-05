# 第十八章：并发编程

> 🔑 **核心观点：** Rust 通过类型系统和所有权机制，在**编译期**阻止了大部分并发 Bug——数据竞争在安全 Rust 中根本无法通过编译。

## 为什么并发很难？

传统语言中的并发 Bug 在运行时才暴露——随机崩溃、数据损坏、难以复现。Rust 让编译器帮你拦住它们。

```
  传统语言的并发困境           Rust 的解决方案
  ┌─────────────────────┐    ┌─────────────────────────┐
  │ 线程A 读x  线程B 写x │    │ 编译器检查所有权+借用规则  │
  │   ↓         ↓      │    │  · 不能同时可变+不可变借用  │
  │ 旧值!    覆盖A的结果 │    │  · Rc<T> 不能跨线程      │
  │ 结果：不确定行为 💀   │    │ 结果：数据竞争编译期阻止 ✅ │
  └─────────────────────┘    └─────────────────────────┘
```

## 两种并发范式

```
  消息传递 (Channel)              共享状态 (Mutex + Arc)
  ┌────────────────────┐         ┌────────────────────────┐
  │ 线程A ─[消息]─▶ 线程B│         │ 线程A ─┐   ┌── 线程B   │
  │ · 所有权随消息转移  │         │        │锁│            │
  │ · 不需要锁         │         │        ▼   ▼            │
  └────────────────────┘         │     [共享数据D]          │
                                 └────────────────────────┘
```

> 💡 **提示：** 优先使用消息传递，必要时再用共享状态。

---

## 一、创建线程 — `thread::spawn`

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            println!("子线程: {}", i);
            thread::sleep(Duration::from_millis(100));
        }
    });
    for i in 1..=3 {
        println!("主线程: {}", i);
        thread::sleep(Duration::from_millis(150));
    }
    handle.join().unwrap(); // 阻塞主线程直到子线程结束
}
```

| 方法 | 作用 |
|------|------|
| `thread::spawn(f)` | 创建新线程，返回 `JoinHandle` |
| `handle.join()` | 阻塞等待线程完成，返回 `Result<T>` |
| `thread::Builder::new()` | 设置线程名、栈大小等 |

> ⚠️ **警告：** 不调用 `join()`，主线程结束时子线程会被**强制终止**。

---

## 二、`move` 闭包

闭包默认借用变量，但线程可能活得更久。Rust 要求用 `move` 转移所有权。

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];
    let handle = thread::spawn(move || {
        println!("子线程收到: {:?}", data); // data 所有权属于闭包
    });
    // println!("{:?}", data); // ❌ 编译错误！data 已被 move
    handle.join().unwrap();
}
```

如果主线程也要用数据，先 `clone()` 一份给子线程：

```rust
let name = String::from("Rust");
let name_clone = name.clone();
let handle = thread::spawn(move || println!("子线程: {}", name_clone));
println!("主线程: {}", name); // ✅ 仍可用
handle.join().unwrap();
```

---

## 三、消息传递 — Channel

```
  Channel 工作原理
  ┌────────┐                 ┌────────┐
  │ 发送端 │ ── mpsc 通道 ── │ 接收端 │
  │ (tx)   │                 │ (rx)   │
  └────────┘                 └────────┘
  tx.send(data)              rx.recv()     阻塞等待
  可以 clone()               rx.try_recv() 非阻塞
  mpsc = Multiple Producer, Single Consumer
```

### 单生产者

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        for msg in ["你好", "来自", "子线程"] {
            tx.send(msg.to_string()).unwrap();
            thread::sleep(std::time::Duration::from_millis(200));
        }
    });
    for received in rx { println!("收到: {}", received); }
}
```

### 多生产者

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    for i in 0..3 {
        let tx_clone = tx.clone();
        thread::spawn(move || {
            tx_clone.send(format!("线程 {} 的消息", i)).unwrap();
        });
    }
    drop(tx); // 关键！关闭原始发送端，否则 rx 迭代永不结束
    for msg in rx { println!("{}", msg); }
}
```

> ⚠️ **警告：** 必须 `drop(tx)`，否则原始发送端存活，`rx` 的迭代永远不结束。

### 同步通道 `sync_channel`

`sync_channel(n)` 创建带缓冲的通道，缓冲区满时发送端阻塞。`sync_channel(0)` 是零缓冲——发送端阻塞直到接收端准备好。

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::sync_channel(2); // 缓冲区容量 2
    thread::spawn(move || {
        for i in 0..5 { tx.send(i).unwrap(); } // 缓冲区满时阻塞
    });
    for msg in rx { println!("处理: {}", msg); }
}
```

---

## 四、共享状态 — `Mutex<T>`

```
  Mutex: 同一时刻只有一个线程能访问数据
  ┌───────────────────────────────────┐
  │  线程A ──┐                        │
  │  线程B ──┼── lock() ──▶ MutexGuard │──▶ 访问数据 T
  │  线程C ──┘                        │   Drop 时自动释放锁
  └───────────────────────────────────┘
```

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);
    {
        let mut num = m.lock().unwrap(); // 获取锁，返回 MutexGuard
        *num = 6;
    } // MutexGuard drop，自动释放锁
    println!("m = {:?}", m);
}
```

> 🔑 **关键概念：** `MutexGuard` 用 RAII 模式——drop 时自动释放锁，消除"忘记释放"的 Bug。

### 锁中毒（Poison）

持有锁的线程 panic 后，Mutex 被标记为 poisoned，后续 `lock()` 返回 `Err`。大多数代码用 `.unwrap()` 处理，高可用场景可用 `poisoned.into_inner()` 继续访问数据。

---

## 五、`Arc<Mutex<T>>` 模式

**最常见的并发模式：** `Arc` 提供线程安全共享所有权，`Mutex` 提供互斥访问。

```
  Arc<Mutex<T>>
  ┌────────────────┐    Arc 是原子引用计数，可跨线程 clone
  │ ref_count: 3   │    Mutex 保证同一时刻只有一个写者
  │ ┌────────────┐ │
  │ │  Mutex<T>  │ │    线程A ──┐
  │ └────────────┘ │    线程B ──┼── Arc::clone()
  └────────────────┘    线程C ──┘
```

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        }));
    }
    for h in handles { h.join().unwrap(); }
    println!("结果: {}", *counter.lock().unwrap()); // 10
}
```

### `RwLock<T>` — 读写锁

读多写少时比 `Mutex` 高效：多个读者可并发，写者独占。

```rust
use std::sync::{Arc, RwLock};

let data = Arc::new(RwLock::new(vec![1, 2, 3]));
let values = data.read().unwrap();      // 读锁，多线程可共享
let mut values = data.write().unwrap(); // 写锁，独占访问
```

| 特性 | `Mutex<T>` | `RwLock<T>` |
|------|-----------|-------------|
| 读操作 | 排他 | 共享（多读者并发） |
| 适用场景 | 读写频率相近 | 读多写少 |

> 💡 **提示：** `RwLock` 有额外开销，读写频率相近时 `Mutex` 反而更快。

---

## 六、`Send` 和 `Sync` Trait

编译器自动推导，是 Rust 并发安全的基石。

| Trait | 含义 | 通俗解释 |
|-------|------|---------|
| `Send` | 可以跨线程转移所有权 | 值能被"发送"到其他线程 |
| `Sync` | 可以被多线程安全引用 | `&T` 能跨线程使用 |

| 类型 | `Send` | `Sync` | 原因 |
|------|--------|--------|------|
| `i32`, `String`, `Vec<T>` | ✅ | ✅ | 基本类型 |
| `Arc<T>`, `Mutex<T>` | ✅ | ✅ | 内置同步 |
| `Rc<T>` | ❌ | ❌ | 引用计数非原子 |
| `RefCell<T>` | ✅ | ❌ | 运行时借用检查 |

```rust
use std::rc::Rc;
let rc = Rc::new(42);
// thread::spawn(move || println!("{}", rc));
// ❌ 编译错误！Rc<i32> 不是 Send
```

---

## 七、常见陷阱

**死锁（运行时，编译器无法阻止）：** 线程1锁a再锁b，线程2锁b再锁a → 死锁。解决：固定锁顺序、用 `try_lock()`、减少锁持有时间。

**线程泄漏：** 忘记 `join()` 导致子线程被强制终止或句柄丢失。

**数据竞争（编译器阻止）：** 不加同步原语的共享可变数据会直接编译失败。

---

## 八、Rayon — 数据并行利器

```toml
[dependencies]
rayon = "1"
```

```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i64> = (1..=1_000_000).collect();
    // 只需把 iter() 改成 par_iter()！
    let sum: i64 = numbers.par_iter().sum();
    println!("总和: {}", sum);
}
```

> 💡 **提示：** Rayon 用工作窃取算法自动管理线程池，数据并行首选它。

---

## 总结

| 概念 | 说明 | 场景 |
|------|------|------|
| `thread::spawn` | 创建线程 | CPU 密集任务 |
| `join()` | 等待线程完成 | 确保执行完毕 |
| `move` 闭包 | 转移所有权到线程 | 线程需要拥有数据 |
| `mpsc::channel` | 多生产者单消费者通道 | 消息传递 |
| `Mutex<T>` | 互斥锁 | 保护共享可变数据 |
| `RwLock<T>` | 读写锁 | 读多写少 |
| `Arc<T>` | 原子引用计数 | 多线程共享所有权 |
| `Arc<Mutex<T>>` | 线程安全共享可变数据 | 最常见并发模式 |
| `Send` / `Sync` | 线程安全 marker trait | 编译器自动检查 |
| Rayon | 数据并行库 | 并行迭代器 |

### 练习建议

1. 用 `thread::spawn` + `join()` 实现并行求和
2. 用 Channel 实现生产者-消费者模式
3. 用 `Arc<Mutex<T>>` 实现多线程安全的计数器
4. 用 `par_iter()` 对比串行和并行的性能差异

> 🔑 **核心总结：** Rust 的并发安全靠编译器检查，不是靠程序员的纪律。`Send` 和 `Sync` 是编译器理解线程安全的语言，`Arc<Mutex<T>>` 是你最常用的模式。拥抱这些约束，你的并发代码将比其他语言更可靠。
