---
title: "atomic 原子变量"
---

# 一、实例用法

## 1. atomic_t的用法

```cpp

atomic_t g_running_hooks = ATOMIC_INIT(0);

int main() {
    int count;

    atomic_inc(&g_running_hooks);                       // 加一
    atomic_dec(&g_running_hooks);                       // 减一
    atomic_set_release(&g_running_hooks, 1);            // 设置为1
    atomic_set_release(&g_running_hooks, 0);            // 设置为0
    count = atomic_read_acquire(&g_running_hooks);      // 读取值
}
```
