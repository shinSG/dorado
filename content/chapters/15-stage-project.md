# 阶段项目：CLI 词频统计工具

> 🎉 恭喜！你已经走过了前 14 章。现在，是时候把所有知识**串起来**，做一个真正的项目了。

本章我们将从零开始，构建一个**命令行词频统计工具**：读取文本文件，统计每个单词的出现次数，按频率降序输出。这个项目会用到你在前 14 章学到的**几乎所有核心概念**。

---

## 程序流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   命令行参数   │────▶│   读取文件    │────▶│   文本处理    │
│  std::env     │     │  File + ?    │     │ split+过滤   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   格式化输出   │◀────│   排序结果    │◀────│  HashMap统计  │
│  println!    │     │  sort_by     │     │  Entry API   │
└──────────────┘     └──────────────┘     └──────────────┘
```

> 🔑 **核心思路**：输入 → 解析 → 统计 → 排序 → 输出。每一步都对应前面章节的知识。

---

## 项目需求

| 功能 | 描述 |
|------|------|
| 文件读取 | 通过命令行参数指定文件路径 |
| 文本处理 | 转小写、去除标点符号 |
| 词频统计 | 统计每个单词出现次数 |
| 排序输出 | 按频率降序，显示前 N 个 |
| 错误处理 | 文件不存在时友好提示 |

---

## 第一步：创建项目

```bash
cargo new wordfreq
cd wordfreq
```

> 💡 **回忆 Ch1**：`cargo new` 创建标准项目结构。`src/main.rs` 是入口，`Cargo.toml` 管理依赖。

---

## 第二步：解析命令行参数

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("用法: wordfreq <文件名> [显示数量]");
        std::process::exit(1);
    }
    let filename = &args[1];
    let top_n: usize = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(10);
    println!("文件: {}, 显示前 {} 个词", filename, top_n);
}
```

> 🔑 **用到**：`Vec`（Ch9）、`Option::and_then`（Ch10）、`parse`（Ch11）、`unwrap_or`（Ch8）。

> 💡 正式项目推荐 `clap` crate，这里用 `std::env` 巩固基础。

---

## 第三步：读取文件内容

```rust
use std::fs;

fn read_file(path: &str) -> String {
    fs::read_to_string(path).unwrap_or_else(|err| {
        eprintln!("无法读取文件 '{}': {}", path, err);
        std::process::exit(1);
    })
}
```

> 🔑 **用到**：`Result` + `unwrap_or_else`（Ch8 错误处理）、闭包（Ch11）。

> ⚠️ 生产代码应返回 `Result<String, io::Error>` 让调用者处理，而不是直接 `exit`。

---

## 第四步：文本处理

```rust
fn extract_words(text: &str) -> Vec<String> {
    text.split_whitespace()
        .map(|word| {
            word.chars()
                .filter(|c| c.is_alphanumeric() || *c == '-')
                .collect::<String>()
                .to_lowercase()
        })
        .filter(|w| !w.is_empty())
        .collect()
}
```

> 🔑 **用到**：`split_whitespace`（Ch9）、`map`/`filter`/`collect`（Ch12）。

> 💡 保留连字符让 "hello-world" 保持为一个词——这是设计决策。

---

## 第五步：用 HashMap 统计词频

```rust
use std::collections::HashMap;

fn count_words(words: &[String]) -> HashMap<String, u32> {
    let mut map = HashMap::new();
    for word in words {
        *map.entry(word.clone()).or_insert(0) += 1;
    }
    map
}
```

> 🔑 **Entry API 是 HashMap 的精髓**（Ch9）：`entry(key)` → `or_insert(0)` → 返回可变引用。

| 方式 | 代码 | 行数 |
|------|------|------|
| Entry API ✅ | `map.entry(k).or_insert(0)` | 1 行 |
| if let 查询 | `if let Some(v) = map.get_mut(k) { ... } else { ... }` | 3 行 |

Entry API 不仅更简洁，而且**只查询一次哈希表**，性能更好。

---

## 第六步：排序并输出

```rust
fn sort_by_frequency(map: HashMap<String, u32>) -> Vec<(String, u32)> {
    let mut vec: Vec<(String, u32)> = map.into_iter().collect();
    vec.sort_by(|a, b| b.1.cmp(&a.1));  // 降序
    vec
}

fn print_table(freq: &[(String, u32)], top: usize) {
    let total: u32 = freq.iter().map(|(_, c)| c).sum();
    println!("\n📊 统计结果 (总词数: {}, 不同词: {})\n", total, freq.len());
    println!("┌─{0:─<20}─┬─{1:─>8}─┐", "", "");
    println!("│ {:<20} │ {:>8} │", "单词", "出现次数");
    println!("├─{0:─<20}─┼─{1:─>8}─┤", "", "");
    for (word, count) in freq.iter().take(top) {
        println!("│ {:<20} │ {:>8} │", word, count);
    }
    println!("└─{0:─<20}─┴─{1:─>8}─┘", "", "");
}
```

> 🔑 **用到**：`into_iter()`（Ch12）、`sort_by`（Ch11）、`take`/`sum`（Ch12）。

---

## 第七步：组装并运行

```rust
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 { eprintln!("用法: wordfreq <文件名> [显示数量]"); std::process::exit(1); }
    let top_n: usize = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(10);
    let content = read_file(&args[1]);
    let sorted = sort_by_frequency(count_words(&extract_words(&content)));
    print_table(&sorted, top_n);
}
```

```bash
cargo run -- sample.txt 5
```

---

## 重构：提取模块

当 `main.rs` 超过 100 行，就该考虑拆分了（Ch13）。

```
src/
├── main.rs          # 入口 + 参数解析
├── counter.rs       # 词频统计逻辑
└── display.rs       # 格式化输出
```

```rust
// src/counter.rs — 用 pub 暴露接口
pub fn extract_words(text: &str) -> Vec<String> { /* ... */ }
pub fn count_words(words: &[String]) -> HashMap<String, u32> { /* ... */ }
pub fn sort_by_frequency(map: HashMap<String, u32>) -> Vec<(String, u32)> { /* ... */ }
```

```rust
// src/main.rs — 通过模块名调用
mod counter;
mod display;
fn main() {
    let words = counter::extract_words(&content);
    let freq_map = counter::count_words(&words);
    let sorted = counter::sort_by_frequency(freq_map);
    display::print_table(&sorted, top_n);
}
```

> 🔑 `counter` 只管统计，`display` 只管输出，`main` 负责协调——职责清晰。

---

## 添加测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_words() {
        assert_eq!(extract_words("Hello, World!"), vec!["hello", "world"]);
        assert!(extract_words("").is_empty());
    }

    #[test]
    fn test_count_words() {
        let words = vec!["rust".into(), "is".into(), "rust".into()];
        let map = count_words(&words);
        assert_eq!(map.get("rust"), Some(&2));
        assert_eq!(map.get("is"), Some(&1));
    }

    #[test]
    fn test_sort_order() {
        let mut map = HashMap::new();
        map.insert("a".into(), 3); map.insert("c".into(), 5); map.insert("b".into(), 1);
        let sorted = sort_by_frequency(map);
        assert_eq!(sorted.iter().map(|(_, c)| *c).collect::<Vec<_>>(), vec![5, 3, 1]);
    }
}
```

```bash
cargo test
# running 3 tests ... test result: ok. 3 passed; 0 failed
```

> 🔑 `#[cfg(test)]` 只在测试时编译；测试放在模块内部；每个测试验证一个行为。

---

## 错误处理策略

当前方案用 `process::exit(1)`。更好的方式：

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 { return Err("缺少文件名".into()); }
    let content = std::fs::read_to_string(&args[1])?;  // ? 传播错误
    // ...
    Ok(())
}
```

| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| `process::exit` | 简单脚本 | 直接 | 不可测试 |
| `Result` + `?` | 库代码 | 可组合 | 需处理返回值 |
| `anyhow` crate | 应用程序 | 简洁 | 外部依赖 |

---

## 扩展思路

| 扩展 | 涉及知识 | 难度 |
|------|---------|------|
| `--top N` 参数 | `clap` crate | ⭐⭐ |
| 正则过滤 | `regex` crate | ⭐⭐ |
| 读取 stdin | `std::io::stdin()` | ⭐ |
| 输出 JSON | `serde` + `serde_json` | ⭐⭐ |
| 多线程并行 | `std::thread`（阶段二）| ⭐⭐⭐ |

> 💡 先试 stdin 支持——只需 5 行改动：
> ```rust
> if filename == "-" {
>     std::io::stdin().read_to_string(&mut content)?;
> } else {
>     content = read_file(filename)?;
> }
> ```

---

## 完整最终代码

> 将前面第一到第七步的函数代码、重构后的模块结构、以及上面的测试代码组合在一起，就是可直接运行的完整项目。建议你先自己动手拼一遍，再对照下面的 `src/` 目录结构检查：

```
src/
├── main.rs       # use声明 + read_file + main()
├── counter.rs    # extract_words + count_words + sort_by_frequency + #[cfg(test)]
└── display.rs    # print_table
```

---

## 知识点回顾

本项目**贯穿了前 14 章的核心知识**：

| 章节 | 用到了什么 | 在哪里 |
|------|-----------|--------|
| Ch1 环境搭建 | `cargo new/run/test` | 项目创建 |
| Ch2 变量类型 | `let`, `&str`, `String`, `usize` | 全程 |
| Ch3 函数 | 函数定义与返回值 | 所有函数 |
| Ch4 控制流 | `if`, `for` | 主循环 |
| Ch7 枚举模式 | `Option`, `get()` | 参数解析 |
| Ch8 错误处理 | `Result`, `unwrap_or_else` | 文件读取 |
| Ch9 集合 | `Vec`, `HashMap`, Entry API | 核心逻辑 |
| Ch10 泛型 | `Option::and_then` | 参数处理 |
| Ch11 闭包 | `map`, `filter`, `sort_by` | 迭代器链 |
| Ch12 迭代器 | `collect`, `take`, `sum` | 文本处理 |
| Ch13 模块 | `mod`, `pub` | 重构 |
| Ch14 测试 | `#[test]`, `assert_eq!` | 测试代码 |

> 🔑 **你已经掌握了足够多的知识来做真实的项目。** 每一行都不是孤立的概念，而是真实代码的一部分。

---

## 本章小结

通过这 15 章，你已经：

```
✅ 理解 Rust 的所有权和借用机制
✅ 能使用结构体和枚举建模
✅ 掌握错误处理的 Result 模式
✅ 熟练使用集合和迭代器
✅ 能组织模块和编写测试
✅ 完成了一个完整的 CLI 项目
```

**你已经不是 Rust 新手了。** 你拥有了足够的基础来进入阶段二。

> 💡 **下一步预告**：阶段二将学习**系统编程**——智能指针（`Box`, `Rc`, `Arc`）、并发编程（线程、锁、channel）、异步编程（`async`/`await`）、以及网络编程。准备好了吗？让我们继续！🦀
