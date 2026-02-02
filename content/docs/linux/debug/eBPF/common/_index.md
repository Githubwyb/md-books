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

# 三、bpf安装

## 1. 源码安装

### 1.1. 需要编译内核开启下面的选项

```shell
Symbol: DEBUG_INFO_BTF [=y]
Type  : bool
Defined at lib/Kconfig.debug:377
   Prompt: Generate BTF type information
   Depends on: DEBUG_INFO [=y] && !DEBUG_INFO_SPLIT [=n] && !DEBUG_INFO_REDUCED [=n] && (!GCC_PLUGIN_RANDSTRUCT [=n] || COMPILE_TEST [=n]) && BPF_SYSCALL [=y] && PAHOLE_VERSION [=125]>=116 && (DEBUG_INFO_DWARF4 [=n] || PAHOLE_VERSION [=125]>=121) && !HEXAGON
   Location:
     -> Kernel hacking
       -> Compile-time checks and compiler options
         -> Generate BTF type information (DEBUG_INFO_BTF [=y])
```

其中`PAHOLE_VERSION`需要安装dwarves才行，主要是需要有`pahole`命令，版本大于内核要求版本
