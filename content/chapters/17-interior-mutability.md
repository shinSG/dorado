# 第17章：内部可变性（Interior Mutability）

## 为什么需要内部可变性？

Rust 的借用规则很严格：任意时刻，要么一个 `&mut T`，要么多个 `&T`，不可兼得。
但有些场景下，编译器过于保守：

```rust
struct Logger { count: u32 }

impl Logger {
    // 问题：log 只需 &self，但要修改 count
    fn log(&self, msg: &str) {
        // self.count += 1;  // ❌ 编译错误！&self 不允许修改
        println!("{}", msg);
    }
}
```

> 🔑 **内部可变性**把借用检查从编译期推迟到运行期，在拥有 `&T` 的同时修改内部数据。

```
┌───────────────────────────────────────────────────────┐
│              Rust 借用检查系统                           │
│                                                       │
│   编译时检查（默认）           运行时检查（内部可变性）    │
│   ┌──────────────────┐      ┌──────────────────────┐  │
│   │ &T / &mut T      │      │ Cell<T>              │  │
│   │ 所有权转移        │      │ RefCell<T>           │  │
│   │ 编译器自动检查    │      │ Mutex<T> / RwLock<T> │  │
│   │ 零运行时开销      │      └──────────────────────┘  │
│   └──────────────────┘              ↓                  │
│        ↓                       运行时 panic / 阻塞      │
│   编译通过 = 安全             运行时才发现问题             │
└───────────────────────────────────────────────────────┘
```

> 💡 能用编译时检查就用编译时检查。内部可变性是"逃生舱口"，不是常规工具。

---

## Cell\<T\>：零开销的 Copy 类型方案

`Cell<T>` 通过**整体替换值**避免借用冲突，适用于 `Copy` 类型：

```rust
use std::cell::Cell;

fn main() {
    let c = Cell::new(42);
    let old = c.get();    // 复制出当前值（T: Copy）
    c.set(100);           // 整体替换内部值
    println!("旧值: {}, 新值: {}", old, c.get());
}
```

> 🔑 没有运行时借用检查，不会 panic，性能与直接操作值完全一样。

实际用法——在 `&self` 方法中修改内部状态：

```rust
use std::cell::Cell;

struct Counter { value: Cell<u32> }

impl Counter {
    fn new() -> Self { Counter { value: Cell::new(0) } }
    fn increment(&self) { self.value.set(self.value.get() + 1); }
    fn get(&self) -> u32 { self.value.get() }
}

fn main() {
    let c = Counter::new();
    c.increment(); c.increment(); c.increment();
    println!("计数: {}", c.get()); // 3
}
```

---

## RefCell\<T\>：运行时借用检查

当数据不是 `Copy` 类型或需要获取引用时，使用 `RefCell<T>`：

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(vec![1, 2, 3]);

    { let r = data.borrow();          // 不可变借用，返回 Ref<T>
      println!("读取: {:?}", *r); }

    { let mut w = data.borrow_mut();  // 可变借用，返回 RefMut<T>
      w.push(4); }

    println!("修改后: {:?}", data.borrow()); // [1, 2, 3, 4]
}
```

运行时借用状态机：

```
    无借用 ──borrow()──→ 不可变借用活跃（可多个）
      ↑                     │
      └──所有 Ref drop──────┘
      │
      └──borrow_mut()──→ 可变借用活跃（唯一）
                            │
               违反规则 → panic!
```

> ⚠️ `RefCell` 的 panic 是运行时错误！用 `try_borrow()` / `try_borrow_mut()` 返回 `Result` 避免 panic。

---

## Rc\<RefCell\<T\>\>：经典的共享可变模式

`Rc` 提供多所有者，`RefCell` 提供内部可变性：

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let shared = Rc::new(RefCell::new(vec![1, 2, 3]));
    let a = Rc::clone(&shared);
    let b = Rc::clone(&shared);

    a.borrow_mut().push(4);
    b.borrow_mut().push(5);

    println!("{:?}", shared.borrow()); // [1, 2, 3, 4, 5]
    println!("引用计数: {}", Rc::strong_count(&shared)); // 3
}
```

```
  a ──┐
  b ──┼──→ Rc<RefCell<Vec<i32>>>  ──→ [1, 2, 3, 4, 5]
      │         引用计数 = 3         借用计数 = 0
  共享 ┘
```

> ⚠️ `Rc` 不是线程安全的！多线程场景必须用 `Arc<Mutex<T>>`。

---

## Arc\<Mutex\<T\>\>：多线程的共享可变

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
            // MutexGuard drop 时自动释放锁
        }));
    }

    for h in handles { h.join().unwrap(); }
    println!("结果: {}", *counter.lock().unwrap()); // 10
}
```

```
  线程 1 ──→ lock() ─┐
  线程 2 ──→ lock() ─┼──→ Mutex<i32>
  线程 3 ──→ lock() ─┘       │
                     只有获锁者能访问
                     guard drop → 释放锁
                     中毒（poisoned）→ lock() 返回 Err
```

> ⚠️ **死锁**：同一线程对同一 Mutex 调用两次 `lock()` 会永久阻塞。
> 用 `try_lock()` 返回 `Result` 避免死锁。

---

## RwLock\<T\>：读写锁

允许多个读者同时访问，写者独占：

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let config = Arc::new(RwLock::new(vec!["localhost".to_string()]));

    // 多个读者可并发
    let r = config.read().unwrap();
    println!("读: {:?}", *r);
    drop(r);

    // 写者独占
    let mut w = config.write().unwrap();
    w.push("port=8080".to_string());
}
```

| 场景 | 推荐 | 原因 |
|------|------|------|
| 读多写少 | `RwLock` | 读者并发，性能高 |
| 读写均衡 | `Mutex` | 实现更简单 |
| 写多读少 | `Mutex` | RwLock 切换开销反而大 |

---

## OnceCell / OnceLock：一次性初始化

```rust
use std::sync::OnceLock;

static CONFIG: OnceLock<String> = OnceLock::new();

fn get_config() -> &'static str {
    CONFIG.get_or_init(|| {
        println!("初始化中...");
        "postgres://localhost/db".to_string()
    })
}

fn main() {
    println!("{}", get_config()); // 打印"初始化中..."
    println!("{}", get_config()); // 直接返回缓存值
}
```

| 类型 | 线程安全 | 用途 |
|------|---------|------|
| `OnceCell<T>` | ❌ | 单线程一次性初始化 |
| `OnceLock<T>` | ✅ | 全局常量、懒初始化单例 |

---

## 组合模式总览

```
  单线程:  Cell<T>          ──→ Copy 类型，零开销
           RefCell<T>       ──→ 任意类型，运行时借用检查
           Rc<RefCell<T>>   ──→ 多所有者 + 可变
           OnceCell<T>      ──→ 一次性初始化

  多线程:  Arc<Mutex<T>>    ──→ 互斥访问
           Arc<RwLock<T>>   ──→ 读写分离
           OnceLock<T>      ──→ 一次性初始化（线程安全）
```

---

## 常见陷阱

**RefCell panic**：持有 `borrow()` 时调用 `borrow_mut()` → panic
```rust
let d = RefCell::new(42);
let r = d.borrow();
// d.borrow_mut(); // 💥 panic
// d.try_borrow_mut(); // ✅ 返回 Err，不 panic
```

**Mutex 死锁**：同一线程嵌套 `lock()` → 永久阻塞
```rust
let m = Mutex::new(42);
let g = m.lock().unwrap();
// m.lock().unwrap(); // 💥 死锁
// m.try_lock();      // ✅ 返回 Err，不阻塞
```

**多锁顺序**：线程 A 先锁 X 再锁 Y，线程 B 也必须先锁 X 再锁 Y，否则死锁。

**性能选择**：`Cell` < `RefCell` < `Mutex` < `RwLock`，能用简单方案就不用复杂方案。

---

## 选择决策树

```
需要内部可变性？
├─ Copy 类型 → Cell<T>
├─ 非 Copy 类型，需要引用
│   ├─ 单线程 → RefCell<T>
│   └─ 多线程 → 读多写少? RwLock<T> : Mutex<T>
├─ 需要多所有者
│   ├─ 单线程 → Rc<RefCell<T>>
│   └─ 多线程 → Arc<Mutex<T>>
└─ 只需初始化一次
    ├─ 单线程 → OnceCell<T>
    └─ 多线程 → OnceLock<T>
```

---

## 实战：线程安全共享缓存

```rust
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::thread;

struct Cache { data: RwLock<HashMap<String, String>> }

impl Cache {
    fn new() -> Self { Cache { data: RwLock::new(HashMap::new()) } }
    fn get(&self, key: &str) -> Option<String> {
        self.data.read().unwrap().get(key).cloned()
    }
    fn set(&self, key: String, value: String) {
        self.data.write().unwrap().insert(key, value);
    }
}

fn main() {
    let cache = Arc::new(Cache::new());
    let mut handles = vec![];

    for i in 0..5 {
        let c = Arc::clone(&cache);
        handles.push(thread::spawn(move || {
            c.set(format!("key_{}", i), format!("val_{}", i));
        }));
    }
    for h in handles { h.join().unwrap(); }

    println!("key_0 = {:?}", cache.get("key_0")); // Some("val_0")
}
```

---

## 本章小结

| 类型 | 用途 | 线程安全 | 关键方法 |
|------|------|---------|---------|
| `Cell<T>` | Copy 类型内部可变性 | ❌ | `get()`, `set()` |
| `RefCell<T>` | 运行时借用检查 | ❌ | `borrow()`, `borrow_mut()` |
| `Rc<RefCell<T>>` | 单线程多所有者可变 | ❌ | `clone`, `borrow_mut()` |
| `Mutex<T>` | 多线程互斥 | ✅ | `lock()`, `try_lock()` |
| `RwLock<T>` | 多线程读写分离 | ✅ | `read()`, `write()` |
| `OnceCell/Lock` | 一次性初始化 | 视变体 | `set()`, `get()` |

> 🔑 内部可变性是借用检查系统的"安全阀"，把编译器无法证明的安全性推迟到运行时验证。
> 用对了是利器，用错了是陷阱。优先用编译时检查，内部可变性是最后手段。

### 练习建议

1. 用 `Cell` 和 `RefCell` 分别实现 `Counter`，体会差异
2. 故意制造 `RefCell` 借用冲突，观察 panic 信息
3. 用 `Arc<Mutex<T>>` 实现多线程计数器，对比 `AtomicU32`
4. 阅读标准库 `RefCell` 源码（约 200 行），理解运行时借用检查实现
