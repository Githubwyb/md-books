---
title: "eBPF总述"
weight: 1
---

# 一、什么是eBPF

eBPF是linux内核的一项革命性技术，可以在操作系统中运行沙盒程序，被用来安全和有效地扩展内核的功能而不改变内核的源码或加载内核模块。

# 二、如何使用eBPF

直接编写eBPF比较复杂，就像裸写javascripts，所以大佬们开发了框架可以让开发者更方便使用eBPF，就像jQuery、nodejs对于javascripts一样。最熟知的两个框架就是bcc和bpftrace。

- bcc比较适合一些复杂的工具和代理使用
- bpftrace比较适合写一些小的脚本和动态跟踪一些程序，bpftrace的依赖很少，一个二进制就可以运行
