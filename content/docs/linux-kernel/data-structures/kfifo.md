---
title: "kfifo 无锁循环队列"
---

# 一、提供的接口

## 1. 定义相关

- 声明和初始化

```cpp
// include/linux/kfifo.h
/**
 * DECLARE_KFIFO - macro to declare a fifo object
 * @fifo: name of the declared fifo
 * @type: type of the fifo elements
 * @size: the number of elements in the fifo, this must be a power of 2
 */
#define DECLARE_KFIFO(fifo, type, size) STRUCT_KFIFO(type, size) fifo

/**
 * INIT_KFIFO - Initialize a fifo declared by DECLARE_KFIFO
 * @fifo: name of the declared fifo datatype
 */
#define INIT_KFIFO(fifo) \
(void)({ \
    typeof(&(fifo)) __tmp = &(fifo); \
    struct __kfifo *__kfifo = &__tmp->kfifo; \
    __kfifo->in = 0; \
    __kfifo->out = 0; \
    __kfifo->mask = __is_kfifo_ptr(__tmp) ? 0 : ARRAY_SIZE(__tmp->buf) - 1;\
    __kfifo->esize = sizeof(*__tmp->buf); \
    __kfifo->data = __is_kfifo_ptr(__tmp) ?  NULL : __tmp->buf; \
})
```

- 声明和初始化一起可以用`DEFINE_KFIFO`

```cpp
// include/linux/kfifo.h
/**
 * DEFINE_KFIFO - macro to define and initialize a fifo
 * @fifo: name of the declared fifo datatype
 * @type: type of the fifo elements
 * @size: the number of elements in the fifo, this must be a power of 2
 *
 * Note: the macro can be used for global and local fifo data type variables.
 */
#define DEFINE_KFIFO(fifo, type, size) \
    DECLARE_KFIFO(fifo, type, size) = \
    (typeof(fifo)) { \
        { \
            { \
            .in = 0, \
            .out    = 0, \
            .mask   = __is_kfifo_ptr(&(fifo)) ? \
                  0 : \
                  ARRAY_SIZE((fifo).buf) - 1, \
            .esize  = sizeof(*(fifo).buf), \
            .data   = __is_kfifo_ptr(&(fifo)) ? \
                NULL : \
                (fifo).buf, \
            } \
        } \
    }
```

## 2. 操作相关

- 单个元素操作

```cpp
// include/linux/kfifo.h
/**
 * kfifo_put - put data into the fifo
 * @fifo: address of the fifo to be used
 * @val: the data to be added
 *
 * This macro copies the given value into the fifo.
 * It returns 0 if the fifo was full. Otherwise it returns the number
 * processed elements.
 *
 * Note that with only one concurrent reader and one concurrent
 * writer, you don't need extra locking to use these macro.
 */
#define kfifo_put(fifo, val)
...

/**
 * kfifo_get - get data from the fifo
 * @fifo: address of the fifo to be used
 * @val: address where to store the data
 *
 * This macro reads the data from the fifo.
 * It returns 0 if the fifo was empty. Otherwise it returns the number
 * processed elements.
 *
 * Note that with only one concurrent reader and one concurrent
 * writer, you don't need extra locking to use these macro.
 */
#define kfifo_get(fifo, val) \
__kfifo_uint_must_check_helper( \
({ \
    typeof((fifo) + 1) __tmp = (fifo); \
    typeof(__tmp->ptr) __val = (val); \
    unsigned int __ret; \
    const size_t __recsize = sizeof(*__tmp->rectype); \
    struct __kfifo *__kfifo = &__tmp->kfifo; \
    if (__recsize) \
        __ret = __kfifo_out_r(__kfifo, __val, sizeof(*__val), \
            __recsize); \
    else { \
        __ret = !kfifo_is_empty(__tmp); \
        if (__ret) { \
            *(typeof(__tmp->type))__val = \
                (__is_kfifo_ptr(__tmp) ? \
                ((typeof(__tmp->type))__kfifo->data) : \
                (__tmp->buf) \
                )[__kfifo->out & __tmp->kfifo.mask]; \
            smp_wmb(); \
            __kfifo->out++; \
        } \
    } \
    __ret; \
}) \
)
```

## 3. 获取属性

```cpp
// include/linux/kfifo.h
/**
 * kfifo_is_empty - returns true if the fifo is empty
 * @fifo: address of the fifo to be used
 */
#define kfifo_is_empty(fifo) \
({ \
    typeof((fifo) + 1) __tmpq = (fifo); \
    __tmpq->kfifo.in == __tmpq->kfifo.out; \
})

/**
 * kfifo_is_full - returns true if the fifo is full
 * @fifo: address of the fifo to be used
 */
#define kfifo_is_full(fifo)
```

## 示例用法

```cpp
/* keybuf.h */
#include <linux/kfifo.h>
#define KEYBUF_KFIFO_SIZE 32
// 这里将类型单独定义出来
typedef STRUCT_KFIFO(unsigned char, 32) KeyBufType;
// 按键结构体
extern KeyBufType g_keybuf;

/* keybuf.c */
#include <linux/kfifo.h>
KeyBufType g_keybuf = (typeof(g_keybuf)){{{
    .in = 0,
    .out = 0,
    .mask = __is_kfifo_ptr(&(g_keybuf)) ? 0 : ARRAY_SIZE((g_keybuf).buf) - 1,
    .esize = sizeof(*(g_keybuf).buf),
    .data = __is_kfifo_ptr(&(g_keybuf)) ? NULL : (g_keybuf).buf,
}}};

void intHandler() {
    ...
    // 插入一个数据
    kfifo_put(&g_keybuf, data);
}

/* main.c */
#include "keybuf.h"

int main() {
    for (;;) {
        io_cli();
        // 判断是否为空
        if (kfifo_is_empty(&g_keybuf)) {
            io_stihlt();
        } else {
            // 取一个数据出来
            unsigned char i;
            kfifo_get(&g_keybuf, &i);
            ...
        }
    }
}

```

# 二、源码分析

## 1. 定义

- 主要结构体`__kfifo`

```cpp
// include/linux/kfifo.h
struct __kfifo {
    unsigned int    in;     // 写索引
    unsigned int    out;    // 读索引
    unsigned int    mask;   // 读写的mask，循环的高效写法的关键
    unsigned int    esize;  // 数据的长度
    void        *data;      // 数据段起始地址
};
```

- 联合声明
- `type`、`const_type`、`ptr`和`ptr_const`的值没有实际含义，只是在后续实现的时候可以使用`typeof()`来找到类型，可以理解成是模板的C语言版本实现
- `rectype`是作为一个占位符存在的，看清楚是一个指针数组，相当于可以指定头部大小，recsize指定即可，默认的是0，也就是按照`__kfifo`的大小最小占位

```cpp
#define __STRUCT_KFIFO_COMMON(datatype, recsize, ptrtype) \
    union { \
        struct __kfifo  kfifo; \
        datatype    *type; \
        const datatype  *const_type; \
        char        (*rectype)[recsize]; \
        ptrtype     *ptr; \
        ptrtype const   *ptr_const; \
    }
```

## 2. 操作

### 2.1. `kfifo_put`

- 定义

```cpp
// include/linux/kfifo.h
#define kfifo_put(fifo, val) \
({ \
    typeof((fifo) + 1) __tmp = (fifo); \
    typeof(*__tmp->const_type) __val = (val); \
    unsigned int __ret; \
    size_t __recsize = sizeof(*__tmp->rectype); \
    struct __kfifo *__kfifo = &__tmp->kfifo; \
    if (__recsize) \
        __ret = __kfifo_in_r(__kfifo, &__val, sizeof(__val), \
            __recsize); \
    else { \
        __ret = !kfifo_is_full(__tmp); \
        if (__ret) { \
            (__is_kfifo_ptr(__tmp) ? \
            ((typeof(__tmp->type))__kfifo->data) : \
            (__tmp->buf) \
            )[__kfifo->in & __tmp->kfifo.mask] = \
                *(typeof(__tmp->type))&__val; \
            smp_wmb(); \
            __kfifo->in++; \
        } \
    } \
    __ret; \
})
```

- 宏展开为

```cpp
({
    typeof((&fifo) + 1) __tmp = (&fifo);
    typeof(*__tmp->const_type) __val = (data);
    unsigned int __ret;
    size_t __recsize = sizeof(*__tmp->rectype);
    struct __kfifo *__kfifo = &__tmp->kfifo;
    if (__recsize)
        __ret = __kfifo_in_r(__kfifo, &__val, sizeof(__val), __recsize);
    else {
        __ret = !kfifo_is_full(__tmp);
        if (__ret) {
            (__is_kfifo_ptr(__tmp) ? ((typeof(__tmp->type))__kfifo->data)
                                    : (__tmp->buf))[__kfifo->in & __tmp->kfifo.mask] = *(typeof(__tmp->type))&__val;
            smp_wmb();
            __kfifo->in++;
        }
    }
    __ret;
})
```

- 上面关键点在于`[__kfifo->in & __tmp->kfifo.mask]`，里面的in可以任意溢出，只保留mask的值
- 也就是假设size为32，mask为`0b11111`，in随便加，溢出后被mask与就只剩`0-31`，也就是从0开始，形成循环

## 3. 属性

### 3.1. `kfifo_is_full`

```cpp
// include/linux/kfifo.h
#define kfifo_is_full(fifo)                     \
    ({                                          \
        typeof((fifo) + 1) __tmpq = (fifo);     \
        kfifo_len(__tmpq) > __tmpq->kfifo.mask; \
    })
```

- 宏展开

```cpp
({
    typeof((&fifo) + 1) __tmpq = (&fifo);
    ({
        typeof((__tmpq) + 1) __tmpl = (__tmpq);
        __tmpl->kfifo.in - __tmpl->kfifo.out;
    }) > __tmpq->kfifo.mask;
})
```

- 直接用in减去out，肯定会想如果in溢出从0开始怎么办，举个例子就知道了。假设in和out都是8位，那么`0x00 - 0xff = 0x01`，可以看到，溢出不影响计算两个的差值，所以整个kfifo的操作过程中，in和out只管尽情加就好了，不用考虑溢出的问题
- 两个差值大于mask就说明确实满了，假设容量2个，差值为2，mask为1，大于正好满了
