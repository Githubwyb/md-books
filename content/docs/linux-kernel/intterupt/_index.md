---
weight: 5
bookFlatSection: false
bookCollapseSection: true
title: "中断"
---

# 二、下半部实现

## 1. 软中断

软中断触发时机：

- 从中断返回时触发调用软中断，这时候在中断上下文中，但是是允许响应中断的
- 在ksoftirqd线程中，处于进程上下文中
- 在显示调用软中断的代码中，比如网络子系统

由于软中断调用时机即可能是中断上下文，也可能是进程上下文，所以软中断按照最严格的上下文处理，也就是中断上下文，不允许睡眠。

## 2. tasklet

tasklet是使用软中断实现的，存在高优先级和普通优先级两个tasklet

```cpp
// include/linux/intterupt.h
```

## 3. 工作队列

- 工作队列是运行在进程上下文中，本身优先级很低
- 工作队列线程在每个cpu都有一个，默认的为`event/n`
