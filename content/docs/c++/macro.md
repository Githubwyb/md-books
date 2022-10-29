---
weight: 1
title: "预定义宏"
---

# 一、变量修饰

## 1. 返回值修饰

### 1.1. `_GLIBCXX_NODISCARD`

- `C++17`生效，会在返回值没有使用的情况下编译报`warning`

```cpp
// /usr/include/c++/12.2.0/x86_64-pc-linux-gnu/bits/c++config.h
// Macro to warn about unused results.
#if __cplusplus >= 201703L
# define _GLIBCXX_NODISCARD [[__nodiscard__]]
#else
# define _GLIBCXX_NODISCARD
#endif
```
