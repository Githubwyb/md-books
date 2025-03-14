---
weight: 1
title: "前言和综述"
---

# 名词解释

- DFX（Design For X）: 面向产品生命周期设计以及面向来自客户对产品的要求的设计，X可以指产品生命周期内的某一个环节或特性
- RAMS: 广义可靠性
    - Reliability － 可靠性
    - Availability － 可用性
    - Maintainability － 可维护性
    - Safety － 安全性（人身安全）
- 可维护性: 产品在规定的条件下和规定的时间内，按规定的程序和方法进行维护时，保持或恢复到规定状态的能力。
- 可用性: 是产品在任意一个随机时刻处于可用状态的能力。可用性＝可用时间/（可用时间＋不可用时间）

# 一、大型架构演进

## 1. 系统处理能力提升途径

|          | 垂直伸缩                                                 | 水平伸缩                                                                 |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| 伸缩途径 | 单机性能提升                                             | 增加机器组建集群                                                         |
| 行业     | 传统行业，如银行                                         | 互联网行业                                                               |
| 成本     | 增加处理能力到某个程度后，会需要更多的钱来进行更高的提升 | 增加服务器的成本为线性的                                                 |
| 极限     | 物理处理存在极限<br>操作系统或应用程序处理存在极限       | 增加服务器就可以提升性能<br>应用程序和系统在不同服务器运行，不会达到极限 |

## 2. 架构演进

| 用户数 | 方案                                                | 解决瓶颈                             | 当前性能瓶颈                                             |
| ------ | --------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| 少量   | 单机系统处理                                        |                                      | 数据在业务层处理复杂度                                   |
| 万级   | 使用数据库处理数据，业务读取数据库                  | 应用处理瓶颈                         | 单机数据库读写瓶颈以及应用的cpu处理瓶颈                  |
| 十万级 | 需要增加缓存改善，应用服务分布式集群                | 单机cpu处理瓶颈                      | 数据库io瓶颈                                             |
| 百万级 | 使用cdn和反向代理进行加速响应<br>数据库进行读写分离 | 数据库处理速度，减少静态资源处理消耗 | 文件系统和数据库处理瓶颈                                 |
| 千万级 | 分布式文件系统，分布式数据库系统                    | 文件系统和数据库处理瓶颈             | 数据量大了之后，硬件性能、数据库、处理数据的能力都是瓶颈 |
| 亿级   | 使用搜索引擎、NoSQL、消息队列与分布式服务           | 业务增加的复杂度                     |                                                          |

- 数据库应用分离
- 缓存改进性能
- 应用服务集群，使用负载均衡调度到不同的应用服务器
- 数据库读写分离
- 反向代理和CDN加速响应
- 分布式文件系统和分布式数据库系统
- 使用消息队列与分布式服务
