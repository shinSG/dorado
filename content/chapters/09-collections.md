# 第9章 集合类型（Collections）

> 🔑 Rust 标准库最重要的三种集合：`Vec<T>`、`String`、`HashMap<K, V>`。
> 都在**堆上分配**，大小可**动态增长**，被称为集合的"三巨头"。

---

## Vec\<T\> — 动态数组

### 内存布局

```
栈（Stack）                     堆（Heap）
┌──────────────┐              ┌────┬────┬────┬────┬─────────┐
│ ptr  ────────┼──────────────│ 10 │ 20 │ 30 │    │         │
│ len  = 3     │              └────┴────┴────┴────┴─────────┘
│ cap  = 5     │              已使用3个        预留2个空位
└──────────────┘
```

> 🔑 栈上只有3个字段：ptr、len、cap。`len == cap` 再 push 时会重新分配（通常翻倍），复制旧数据。

### 创建与基本操作

```rust
fn main() {
    let mut v: Vec<i32> = Vec::new();     // 空 Vec
    let v = vec![1, 2, 3];               // 宏创建（最常用）
    let v = vec![0; 10];                 // 10个0
    let v: Vec<i32> = (1..=5).collect();  // 从迭代器收集

    let mut v = vec![1, 2, 3];
    v.push(4);           // 末尾追加
    v.pop();             // 移除最后一个 → Option<T>
    v.insert(0, 0);      // 指定位置插入（O(n)）
    v.remove(1);         // 移除指定位置（O(n)）
    v.len();             // 元素个数
    v.contains(&3);      // 是否包含某值
}
```

### 索引 vs get()

```rust
fn main() {
    let v = vec![10, 20, 30];
    let third = &v[2];            // 索引 —— 越界会 panic!
    let third = v.get(2);        // get() —— 越界返回 None
}
```

> ⚠️ 索引来自**用户输入**时，必须用 `get()` 防止 panic。

### retain / dedup

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5, 6];
    v.retain(|&x| x % 2 == 0);  // 只留偶数 → [2, 4, 6]

    let mut v = vec![1, 1, 2, 2, 1, 1];
    v.dedup();                   // 去除"连续"重复 → [1, 2, 1]
    // 要去全部重复：先 sort() 再 dedup()
}
```

### 用枚举存储不同类型 & VecDeque

```rust
enum Cell { Int(i32), Float(f64), Text(String) }
fn main() {
    let row = vec![Cell::Int(42), Cell::Float(3.14), Cell::Text(String::from("hi"))];
}
// 双端队列：两端增删都是 O(1)
use std::collections::VecDeque;
let mut d = VecDeque::new();
d.push_back(1);   // 尾部
d.push_front(0);  // 头部（Vec 这是 O(n)！）
```

---

## String — 字符串

### UTF-8 编码图解

```
字符串 "hello你好" 在内存中：
字节:   68  65  6c  6c  6f  e4 bd a0  e5 a5 bd
字符:    h   e   l   l   o   ──你──   ──好──
len() = 11（字节数，不是字符数！）
chars().count() = 7（字符数）
```

> 🔑 `String` 本质是 `Vec<u8>` 的包装。中文字符占 3 字节，emoji 占 4 字节。

### String vs &str

| | `String` | `&str` |
|---|---|---|
| 所有权 | 拥有数据 | 借用数据 |
| 可变性 | 可变 | 不可变 |
| 存储 | 堆上 | 可指向堆、栈、静态区 |

```rust
fn main() {
    let s1: &str = "hello";                  // 字面量 → 编译进二进制
    let s2: String = String::from("hello");  // 堆分配
    let s3: String = "hello".to_string();

    // &str → String（分配内存）；String → &str（零开销，自动 Deref）
    fn take_str(s: &str) {}
    take_str(&s2); // 传 &String 自动转为 &str
}
```

### 拼接

```rust
fn main() {
    let mut s = String::from("hello");
    s.push(' ');
    s.push_str("world");

    // + 运算符：左边被 move，右边被借用
    let s1 = String::from("hello ");
    let s2 = String::from("world");
    let s3 = s1 + &s2;    // s1 被消耗！

    // format! 宏：不消耗任何值
    let (s1, s2) = (String::from("hello"), String::from("world"));
    let s3 = format!("{} {}", s1, s2);
}
```

### 常用操作

```rust
fn main() {
    let s = String::from("  Hello, World!  ");
    s.contains("World");     // true
    s.find("World");         // Some(9) — 字节索引
    s.replace("World", "Rust");
    s.trim();                // "Hello, World!"
    let parts: Vec<&str> = "a,b,c".split(',').collect();
}
```

### 为什么不能用 s[0]？

```rust
fn main() {
    let hello = String::from("你好");
    // hello[0] —— 编译错误！6个字节，返回什么？不明确！
    for c in hello.chars() { println!("{}", c); }  // 你, 好
    let first = hello.chars().nth(0);               // Some('你')
    let slice = &hello[0..3];                       // "你"（必须在字符边界）
    // &hello[0..2] —— panic! 截断了 UTF-8 编码
}
```

---

## HashMap\<K, V\> — 哈希映射

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Red"), 50);
    let score = scores.get("Blue");                    // Option<&i32>
    for (k, v) in &scores { println!("{}: {}", k, v); }
    scores.entry(String::from("Yellow")).or_insert(30);
}
```

### Entry API

```rust
use std::collections::HashMap;
fn main() {
    let text = "hello world hello rust hello world";
    let mut word_count = HashMap::new();
    for word in text.split_whitespace() {
        word_count
            .entry(word)
            .and_modify(|c| *c += 1)
            .or_insert(1);
    }
    // {"hello": 3, "world": 2, "rust": 1}
}
```

> 💡 Entry API 比先 get 再 insert 更高效——只做一次哈希查找！

### 键的要求 & 类型别名 & BTreeMap

```rust
use std::collections::HashMap;
// 键必须实现 Eq + Hash
// ✅ i32, String, &str, bool, char
// ❌ f32, f64（NaN != NaN）
type Cache = HashMap<String, Vec<i32>>;  // 类型别名简化复杂类型

// BTreeMap：键自动排序，O(log n)
use std::collections::BTreeMap;
let mut map = BTreeMap::new();
map.insert(3, "three");
map.insert(1, "one");
// 遍历按键序：1, 3
```

| | `HashMap` | `BTreeMap` |
|---|---|---|
| 顺序 | 无序 | 按键排序 |
| 复杂度 | O(1) 平均 | O(log n) |

---

## 集合之间的转换

```rust
use std::collections::{HashMap, HashSet};
fn main() {
    let v: Vec<i32> = (1..=5).collect();
    let s: String = vec!['h','e','l'].into_iter().collect();
    let set: HashSet<i32> = vec![1,2,2,3].into_iter().collect(); // 去重
    let map: HashMap<&str, i32> = vec![("a",1),("b",2)].into_iter().collect();
    let s = String::from_utf8(vec![72,105]).unwrap(); // Vec<u8> → String
    let bytes = String::from("hi").into_bytes();       // String → Vec<u8>
}
```

---

## 常见陷阱

### 遍历时借用冲突

```rust
use std::collections::HashMap;
fn main() {
    let mut map = HashMap::new();
    map.insert("a", 1);
    // ❌ for (k,v) in &map { map.insert("b", 2); }
    // ✅ 先收集再插入
    let updates: Vec<_> = map.iter().map(|(k,_)| (*k, 100)).collect();
    for (k, v) in updates { map.insert(k, v); }
}
```

### 所有权转移

```rust
fn main() {
    let mut map = HashMap::new();
    let key = String::from("name");
    map.insert(key, 1);
    // println!("{}", key);  // ❌ key 已被 move
    // ✅ 用引用作键
    let key = String::from("name");
    let mut map2 = HashMap::new();
    map2.insert(&key, 1);
    println!("{}", key); // ✅
}
```

### Vec 借用期间不能修改

```rust
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];
    // v.push(4);     // ❌ 借用期间不能修改
    println!("{}", first);
    v.push(4);        // ✅ 借用结束后
}
```

---

## 实战：词频统计

```rust
use std::collections::HashMap;

fn word_frequency(text: &str) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for word in text.split_whitespace() {
        let clean: String = word.chars()
            .filter(|c| c.is_alphanumeric())
            .collect::<String>()
            .to_lowercase();
        if !clean.is_empty() {
            counts.entry(clean).and_modify(|c| *c += 1).or_insert(1);
        }
    }
    let mut result: Vec<_> = counts.into_iter().collect();
    result.sort_by(|a, b| b.1.cmp(&a.1));
    result
}

fn main() {
    let text = "the quick brown fox jumps over the lazy dog. The dog barked at the fox.";
    for (word, count) in word_frequency(text).iter().take(5) {
        println!("{:>8} : {}", word, count);
    }
}
```

---

## 本章小结

| 集合类型 | 用途 | 关键方法 |
|----------|------|----------|
| `Vec<T>` | 动态数组 | push, pop, get, retain, sort |
| `String` | 堆字符串 | push_str, contains, replace, trim |
| `&str` | 字符串切片 | split, find, chars, bytes |
| `HashMap<K,V>` | 哈希映射 | insert, get, entry, contains_key |
| `BTreeMap<K,V>` | 有序映射 | insert, range, get |
| `VecDeque<T>` | 双端队列 | push_front, push_back, pop_front |

### 练习建议

1. **Vec**：接收 `Vec<i32>`，返回去重并排序后的结果
2. **String**：用 `trim + split + collect` 把 CSV 行解析为 `Vec<&str>`
3. **HashMap**：统计文本中每个字母出现的次数
4. **综合**：用 `HashMap<String, Vec<String>>` 实现学生按班级分组
