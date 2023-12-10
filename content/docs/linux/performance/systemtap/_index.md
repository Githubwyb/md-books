---
weight: 1
title: "systemtap"
---

参考文档: https://sourceware.org/systemtap/tapsets/

# 一、一些常用的写法

```shell
# 查看可以追踪的列表
=> stap -l 'kernel.trace("*")' | grep kfree_skb
kernel.trace("skb:kfree_skb")
# 编译stap脚本并运行
=> stap --all-modules test.stp
```

# 二、语法

## 1. 内置变量

- `$location`: 当前所在的内存地址
- `$$parms`: 字符串形式，当前函数参数和地址

## 2. 内置函数

- `symname($location)`: 当前所在函数
- `symdata($location)`: 当前所在函数和偏移
- `pid()`: 当前所在进程pid
- `target()`: 由`-x`指定的数据，一般是pid

# 三、实战

#### 1) 查看包释放函数

- 每隔5s打印调用丢包函数的函数

```shell
# 定义全局变量
global locations

# 设置开启和结束
probe begin { printf("Monitor begin\n") }
probe end { printf("Monitor end\n") }

# 追踪kfree_skb函数
probe kernel.trace("kfree_skb") {
    # 将当前位置对应的变量+1
    locations[$location] <<< 1
}

probe timer.sec(5) {
    printf("\n")
    foreach (l in locations-) {
        printf("%d packets dropped at %s\n",
            @count(locations[l]), symname(l)
        )
    }
    delete locations
}
```

- 输出

```
Monitor begin

1 packets dropped at ip_rcv_finish
```

### 1.4. 环境搭建

#### 1) CentOS

- 需要安装下面的包

```shell
yum install gcc systemtap-devel
```

- 想要调试内存的malloc和free，就要配置debuginfo源，然后安装

```shell
yum debuginfo-install glibc
```
