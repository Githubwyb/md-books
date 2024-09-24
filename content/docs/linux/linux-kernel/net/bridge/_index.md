---
title: "linux网桥"
weight: 5
---

# 一、结构和原理

参考 [浅析linux内核网络协议栈--linux bridge（一）](https://zhuanlan.zhihu.com/p/550273312?utm_id=0)

![](imgs/2024-01-01-01.png)

- br0绑定了两个网卡，对于协议栈来说，只能看到一个br0的设备