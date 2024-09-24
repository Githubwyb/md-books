---
weight: 1
title: "知识性说明"
---

# 一、vmcore解析

## 1. 寄存器

### 1.1. 参数寄存器

- 64位汇编中，当参数少于7个时，参数从左到右放入寄存器: rdi, rsi, rdx, rcx, r8, r9

### 1.2. rsp 栈指针寄存器（指向栈顶）

- x86汇编中
- callq会将下一跳地址放到rsp中，rsp自动减四
- push会放到rsp，rsp自动减四
- pop会rsp加四，对应的值存放到寄存器中

### 1.3. gs percpu的基地址寄存器

[FS/GS寄存器的用途](https://zhuanlan.zhihu.com/p/435518616)

- 现代linux x86-64下gs里面存储了percpu的基地址，汇编中使用`%gs:0x15bc0`来取percpu的一些变量地址
- 用户态无法使用gs寄存器
