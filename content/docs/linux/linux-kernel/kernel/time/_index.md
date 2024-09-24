---
title: "时间系统"
---

# 一、前言

中断查看对应cpu架构的timer

# 二、一些宏说明

## 1. 芯片频率

```cpp
// include/linux/timex.h
/* The clock frequency of the i8253/i8254 PIT */
#define PIT_TICK_RATE 1193182ul
```

