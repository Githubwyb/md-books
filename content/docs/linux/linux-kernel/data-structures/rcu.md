---
title: "RCU Read-Copy-Update"
---

[一文带你深入解析Linux内核-RCU机制（超详细~）](https://zhuanlan.zhihu.com/p/516304206)
[Linux 内核：RCU机制与使用](https://www.cnblogs.com/schips/p/linux_cru.html)

# 一、原理

- 对一块数据要写入时，先拷贝一份，更新数据完成后，再更新到原数据结构
- 保证要么读取老数据，要么读取新数据，不会出现读取一半的情况
- 写的时候锁住，等待读，应对写少读多的场景

# 二、关键思想

- 复制后更新数据
- 延迟回收内存，当没有老数据结构引用的读者时，才回收内存
