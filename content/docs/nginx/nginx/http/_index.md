---
weight: 2
bookFlatSection: false
bookCollapseSection: true
title: "http模块"
---

# 一、源码分析

## 1. 几个结构的生命周期和关系

### 1.1. ngx_http_request_t 代表一次http请求

- 和其他结构的代码关系

```cpp
// ngx_http.h
typedef struct ngx_http_request_s     ngx_http_request_t;
// ngx_http_request.h
struct ngx_http_request_s {
    ...
    ngx_connection_t                 *connection;
    ...
    ngx_http_upstream_t              *upstream;
    ...
    ngx_pool_t                       *pool;
    ...
    ngx_http_connection_t            *http_connection;
    ...
};
```

- `ngx_http_request_t`代表一次http请求
- 一次`ngx_connection_t`可以给多个`ngx_http_request_t`使用
- 每个`ngx_http_request_t`必须依赖于一个`ngx_connection_t`，并且持有`r->connection`
- 每个`ngx_http_request_t`拥有自己的内存池`r->pool`，当一次请求结束后会进行释放

#### (1) 创造

- 在`ngx_http_wait_request_handler`中进行构造，存放到`ngx_connection_t`的`data`中
- 每个http请求接收的回调中创建

```cpp
// ngx_http_request.c
static void
ngx_http_wait_request_handler(ngx_event_t *rev)
{
    ...
    c->log->action = "reading client request line";

    ngx_reusable_connection(c, 0);

    c->data = ngx_http_create_request(c);
    ...
}
```

## 2. nginx网络模型

### 2.1. 网络模型总述

- 使用master进程监听端口创建套接字，然后fork子进程，每个子进程就可以复用监听套接字
