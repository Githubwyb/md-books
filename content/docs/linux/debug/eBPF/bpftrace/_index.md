---
title: "bpftrace"
---

# 一、前言

bpftrace是使用一个简单脚本语言进行内核挂载排查，比bcc更加轻量，自然功能也更少。但是满足平常的排查需求是足够了。

# 二、安装

```shell
sudo apt install bpftrace
```

# 三、部分语法解析

https://blog.csdn.net/qq_40711766/article/details/123382244

https://cloud.tencent.com/developer/article/2322518

## 1. 脚本框架

```cpp
// 采用和c语言一样的注释

BEGIN {
    // 开始时执行一次的代码
}

probe
/filter/ {
    // 事件与prob和filter匹配时执行
}

END {
    // 结束时执行
}
```

## 2. 内核探针

```shell
=> bpftrace -l | head
hardware:backend-stalls:
hardware:branch-instructions:
hardware:branch-misses:
hardware:branches:
hardware:bus-cycles:
hardware:cache-misses:
hardware:cache-references:
hardware:cpu-cycles:
hardware:cycles:
hardware:frontend-stalls:
```

## 3. 用户态探针

```shell
=> bpftrace -l 'uprobe:/home/test/a.out:*'
uprobe:/home/test/a.out:__do_global_dtors_aux
uprobe:/home/test/a.out:_fini
uprobe:/home/test/a.out:_init
uprobe:/home/test/a.out:_start
uprobe:/home/test/a.out:deregister_tm_clones
uprobe:/home/test/a.out:frame_dummy
uprobe:/home/test/a.out:main
uprobe:/home/test/a.out:register_tm_clones
```

## 4. 内置变量

| 变量名 | 类型 | 含义              |
| ------ | ---- | ----------------- |
| pid    | %d   | 当前调用的进程pid |
| comm   | %s   | 当前调用的进程名  |

## 5. 内置函数

### count() 统计计数

虽然不知道原理，但是确实可以用

```shell
=> bpftrace -e 'tracepoint:syscalls:sys_enter_fsync { @us = count(); }'
Attaching 1 probe...
^C

@us: 13

```

全局数组方式如下，会自动根据数组key自动统计

```shell
=> bpftrace -e 'tracepoint:syscalls:sys_enter_fsync { @us[comm] = count(); }'
Attaching 1 probe...
^C

@us[mtail]: 3
@us[influxd]: 15
@us[mysqld]: 99

```

### kstack() 内核栈

### ustack() 用户栈

接收两个参数

- mode，stack 模式，可选 bpftrace、perf
- limit，一个整数，获取 stack 的最大深度

bpftrace对于采集的进程是异步的，如果打印ustack过程中进程退出了，会拿不到符号

```shell
=> bpftrace -e 'uprobe:/home/test/test_connect:"net.(*netFD).connect" { printf("%s\n", ustack()); }'
Attaching 1 probe...

        net.(*netFD).connect+0
        net.socket+722
        net.internetSocket+248
        net.(*sysDialer).doDialTCP+239
        net.(*sysDialer).dialTCP+105
        net.(*sysDialer).dialSingle+498
        net.(*sysDialer).dialSerial+581
        net.(*sysDialer).dialParallel+1043
        net.(*Dialer).DialContext+1804
        main.main+607
        runtime.main+519
        runtime.goexit.abi0+1

=> bpftrace -e 'uprobe:/home/test/test_connect:"net.(*netFD).connect" { printf("%s\n", ustack(perf)); }'
Attaching 1 probe...

        4c1000 net.(*netFD).connect+0 (/home/test/test_connect)
        4ce5d2 net.socket+722 (/home/test/test_connect)
        4c80b8 net.internetSocket+248 (/home/test/test_connect)
        4d092f net.(*sysDialer).doDialTCP+239 (/home/test/test_connect)
        4d07c9 net.(*sysDialer).dialTCP+105 (/home/test/test_connect)
        4b9ab2 net.(*sysDialer).dialSingle+498 (/home/test/test_connect)
        4b9405 net.(*sysDialer).dialSerial+581 (/home/test/test_connect)
        4b8a73 net.(*sysDialer).dialParallel+1043 (/home/test/test_connect)
        4b848c net.(*Dialer).DialContext+1804 (/home/test/test_connect)
        4d5f9f main.main+607 (/home/test/test_connect)
        437487 runtime.main+519 (/home/test/test_connect)
        464ca1 runtime.goexit.abi0+1 (/home/test/test_connect)

```

### time(fmt) 打印当前时间

```shell
=> bpftrace -e 'interval:s:1 { time(); }'
Attaching 1 probe...
20:05:25
20:05:26
20:05:27
20:05:28
^C

# 需要加\n，bpftrace的一行输出需要换行才会输出到控制台，没有换行会等下一个换行或者退出时才打印
=> bpftrace -e 'interval:s:1 { time("%Y-%m-%d %H:%M:%S\n"); }'
Attaching 1 probe...
2024-10-17 20:06:34
2024-10-17 20:06:35
2024-10-17 20:06:36
2024-10-17 20:06:37
^C
```

## 6. 定时器

使用示例

```
interval:s:60 {
    // do something
}
```

可以支持格式

```
interval:s:rate
interval:ms:rate
interval:us:rate
```

## 7. 定义变量

### 7.1. @xxx 全局变量

### 7.2. @xxx[xxx] 全局关联数组

### 7.3. @xxx[tid] 线程变量，也就是关联数组用tid作为key

### 7.4. $xxx 局部变量

# 四、uprobe实战实例

## 1. hello world

### 命令行简单版

```shell
=> bpftrace -e 'BEGIN{printf("Hello, world!\n")}'
Attaching 1 probe...
Hello, world!
```

### 脚本

```shell
=> cat hello.bt
BEGIN {
    printf("Hello, world!\n");
}

END {
    printf("Bye, world\n");
}
=> bpftrace hello.bt
Attaching 2 probes...
Hello, world!
^CBye, world
```

# 五、内核实战实例

## 1. 抓fsync系统调用对应的进程

```shell
=> bpftrace -e 'tracepoint:syscalls:sys_enter_fsync { time("%Y-%m-%d %H:%M:%S"); printf(" %d:%s\n", pid, comm); }'
Attaching 1 probe...
2024-09-26 05:49:06 517:systemd-journal
2024-09-26 05:49:39 517:systemd-journal
2024-09-26 05:49:51 788:NetworkManager
2024-09-26 05:49:51 788:NetworkManager
2024-09-26 05:50:41 788:NetworkManager
2024-09-26 05:50:41 788:NetworkManager
2024-09-26 05:51:03 1034:lightdm-gtk-gre
2024-09-26 05:51:03 1034:lightdm-gtk-gre
2024-09-26 05:51:05 1034:lightdm-gtk-gre
2024-09-26 05:51:05 1034:lightdm-gtk-gre
2024-09-26 05:51:07 991:lightdm
2024-09-26 05:51:07 77616:lightdm
```

统计1min内的各个进程计数

```shell
=> cat fsync-collect.bt
BEGIN {
    printf("Begin trace fsync\n");
}

END {
    clear(@us);
    printf("End trace fsync\n");
}

tracepoint:syscalls:sys_enter_fsync {
    @us[comm] = count();
}

interval:s:60 {
    time("===== %Y-%m-%d %H:%M:%S =====\n");
    print(@us);
    clear(@us);
}

=> bpftrace fsync-collect.bt
Attaching 4 probes...
Begin trace fsync
===== 2024-10-09 17:05:01 =====
@us[mtail]: 2
@us[influxd]: 10
@us[mysqld]: 70
===== 2024-10-09 17:06:01 =====
@us[auditd]: 1
@us[mtail]: 2
@us[influxd]: 12
@us[mysqld]: 70
===== 2024-10-09 17:07:01 =====
@us[systemd-journal]: 1
@us[journal-offline]: 2
@us[mtail]: 2
@us[influxd]: 12
@us[mysqld]: 62
```
