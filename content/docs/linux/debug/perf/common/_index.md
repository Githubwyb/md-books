---
title: "perf总述"
weight: 2
---

# 0x01 前言

perf是linux上用来采样分析进程cpu占用的工具，对于性能优化分析非常有用。

perf数据可视化: https://github.com/brendangregg/FlameGraph.git

# 0x02 基本使用

## 1. 命令说明

### perf record

采集数据输出到`perf.data`

- `-a`: 指定全系统所有cpu的采集，和`-C`互斥
- `-C 0,1`、`-C 0-2`： 指定采集哪些cpu的数据
- `-g`: 采集堆栈，对于分析火焰图有帮助，不设置就只会采集当前的函数
- `-p PID`: 采集指定进程的数据
- `-F num`: 指定采集频率

# 0x03 实战

## 1. 采集指定进程生成火焰图

先找到进程id，这里示例程序为129197

采集perf数据

```shell
# 采集二进制数据
=> sudo perf record -a -g -p 129197 -- sleep 30
Warning:
PID/TID switch overriding SYSTEM
[ perf record: Woken up 1 times to write data ]
[ perf record: Captured and wrote 0.079 MB perf.data (261 samples) ]

# 将二进制转成文本数据，自动使用perf.data文件进行生成
=> perf script > out.perf
```

文本数据还是不好看，这里就需要进入到FlameGraph目录下，里面有工具进行转换

```shell
# 将out.perf文件转成折叠后的数据
./stackcollapse-perf.pl < out.perf > out.folded
# 将折叠后的数据转成svg图片展示
./flamegraph.pl out.folded > out.svg
```

到这里火焰图就展示出来了，打开svg图片即可
