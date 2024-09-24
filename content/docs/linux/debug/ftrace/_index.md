---
title: "ftrace"
---

# 一、使用

https://www.kernel.org/doc/html/v4.19/trace/ftrace-uses.html

## 1. ftrace hook内核函数

### 1.1. 前置判断

- 想要hook某个函数，需要内核开启编译选项进行支持
- 正常默认编译选项中可以hook非内联的所有函数（包括静态函数）
- 查看函数是否可以hook可以通过下面命令进行搜索
- hook如果要调用自己函数（调用instruction_pointer_set），在arm64上只有5.5以上支持，x86上是3.x之后就支持了

```shell
=> grep "tcp_options_write" /proc/kallsyms
ffffffffafa03a90 t __pfx_tcp_options_write
ffffffffafa03aa0 t tcp_options_write
```

### 1.2. 基础实现

- Makefile

```makefile
NAME := sdp_toa

obj-m := $(NAME).o

ifeq ($(KERNDIR), )
KDIR := /lib/modules/$(shell uname -r)/build
else
KDIR := $(KERNDIR)
endif
PWD := $(shell pwd)
COMPILE_DATE=$(shell date "+%Y%m%d")
COMPILE_TIME=$(shell date -d $(COMPILE_DATE) "+%s")
$(info COMPILE_TIME=$(COMPILE_TIME))

$(NAME)-objs += main.o \
	ftrace_hook.o

# $(NAME)-y +=
# $(NAME)-n +=

ccflags-y += -DHIDS_FILTER_COMPILE_TIME=$(COMPILE_TIME)
ifeq ($(DEBUG), 1)
ccflags-y += -g -O0 -DDEBUG
endif

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean :
	$(MAKE) -C $(KDIR) M=$(PWD) modules clean
```

- 源文件

```cpp
// ftrace_hook_utils.h
#ifndef _FTRACE_HOOK_UTILS_H_
#define _FTRACE_HOOK_UTILS_H_

#define __SC_DECL(t, a) t a
#define __FTRACE_HOOK_DEFINE_VAR0(m, ...)
#define __FTRACE_HOOK_DEFINE_VAR1(m, t, a, ...) m(t, a)
#define __FTRACE_HOOK_DEFINE_VAR2(m, t, a, ...) m(t, a), __FTRACE_HOOK_DEFINE_VAR1(m, __VA_ARGS__)
#define __FTRACE_HOOK_DEFINE_VAR3(m, t, a, ...) m(t, a), __FTRACE_HOOK_DEFINE_VAR2(m, __VA_ARGS__)
#define __FTRACE_HOOK_DEFINE_VAR4(m, t, a, ...) m(t, a), __FTRACE_HOOK_DEFINE_VAR3(m, __VA_ARGS__)
#define __FTRACE_HOOK_DEFINE_VAR5(m, t, a, ...) m(t, a), __FTRACE_HOOK_DEFINE_VAR4(m, __VA_ARGS__)
#define __FTRACE_HOOK_DEFINE_VAR6(m, t, a, ...) m(t, a), __FTRACE_HOOK_DEFINE_VAR5(m, __VA_ARGS__)
#define FTRACE_HOOK_DEFINE_VAR(n, ...) __FTRACE_HOOK_DEFINE_VAR##n(__VA_ARGS__)

#endif  // _FTRACE_HOOK_UTILS_H_
```

```cpp
// ftrace_hook.h
#ifndef _FTRACE_H_
#define _FTRACE_H_

#include <linux/atomic.h>
#include <linux/ftrace.h>

#include "ftrace_hook_utils.h"

// 自定义log方式就定义hook_log，代码内部会使用hook_log_info等函数进行调用
#ifndef TAG
#define TAG "ftrace_hook"
#endif

#ifndef HOOK_LOG_INFO
#ifdef DEBUG
#define HOOK_LOG_INFO(fmt, ...) pr_info("[%s] " fmt "\n", TAG, ##__VA_ARGS__)
#else
#define HOOK_LOG_INFO(fmt, ...) pr_info("[%s][I][%s:%d] " fmt "\n", TAG, __FUNCTION__, __LINE__, ##__VA_ARGS__)
#endif
#endif

#ifndef HOOK_LOG_WARN
#ifdef DEBUG
#define HOOK_LOG_WARN(fmt, ...) pr_warn("[%s] " fmt "\n", TAG, ##__VA_ARGS__)
#else
#define HOOK_LOG_WARN(fmt, ...) pr_info("[%s][W][%s:%d] " fmt "\n", TAG, __FUNCTION__, __LINE__, ##__VA_ARGS__)
#endif
#endif

#ifndef HOOK_LOG_ERR
#ifdef DEBUG
#define HOOK_LOG_ERR(fmt, ...) pr_err("[%s] " fmt "\n", TAG, ##__VA_ARGS__)
#else
#define HOOK_LOG_ERR(fmt, ...) pr_info("[%s][E][%s:%d] " fmt "\n", TAG, __FUNCTION__, __LINE__, ##__VA_ARGS__)
#endif
#endif

/**
 * @brief Hook项
 *
 */
struct ftrace_hook {
    /** 函数符号名 */
    const char *name;

    /** 替换函数地址 */
    void *replacement;

    /** 原始函数地址 */
    void **original;

    /** 符号的原始地址 */
    unsigned long _address;

    /** ftrace 相关结构体 */
    struct ftrace_ops ops;
};

/**
 * @brief 正在运行的钩子数，如果大于 0 建议不要卸载，等待其变为 0
 */
extern atomic_t g_running_hooks;

/**
 * @brief 钩子进入时调用
 *
 * @param name 函数符号名
 */
static inline void ftrace_hook_func_enter(const char *name) {
    // 增加引用计数，避免模块被释放
    atomic_inc(&g_running_hooks);
}

/**
 * @brief 钩子结束时调用，由宏完成，不必手动调用
 *
 * @param name 函数符号名
 */
static inline void ftrace_hook_func_exit(const char *name) {
    // 减少引用计数
    atomic_dec(&g_running_hooks);
}

/**
 * @brief hook多个函数
 *
 * @param hooks
 * @param count
 * @return int 0 表示全部成功，否则返回 -errno
 */
int ftrace_hook_multi_register(struct ftrace_hook hooks[], size_t count);
/**
 * @brief unhook多个函数，按照反方向unhook
 *
 * @param hooks
 * @param count
 */
void ftrace_hook_multi_unregister(struct ftrace_hook hooks[], size_t count);

/**
 * @brief 启用ftrace的hook功能
 *
 */
void enable_ftrace_hook(void);
/**
 * @brief 禁用ftrace的hook功能
 *
 */
void disable_ftrace_hook(void);
/**
 * @brief 返回当前是否启用ftrace的hook功能
 *
 * @return true
 * @return false
 */
bool is_ftrace_hook_enabled(void);

// 替换的函数名
#define FTRACE_HOOK_REPLACE_NAME(name) __ftrace_hook_replace_##name
// 原始函数名
#define FTRACE_HOOK_ORIG_NAME(name) __ftrace_hook_orig_##name
// 定义结构体
#define FTRACE_HOOK_STRUCT(name)                                                            \
    {                                                                                       \
        #name, FTRACE_HOOK_REPLACE_NAME(name), (void **)&FTRACE_HOOK_ORIG_NAME(name), 0, {} \
    }

/**
 * @brief 定义要替换的函数
 * @param n 函数参数个数
 * @param name 函数名
 * @param return_type 函数返回类型
 * @param ... 函数参数按照type, var的方式传入
 *
 */
#define FTRACE_HOOK_FUNC_REPLACE(n, name, return_type, ...)                                                \
    static return_type (*FTRACE_HOOK_ORIG_NAME(name))(FTRACE_HOOK_DEFINE_VAR(n, __SC_DECL, __VA_ARGS__));  \
    static return_type FTRACE_HOOK_REPLACE_NAME(name)(FTRACE_HOOK_DEFINE_VAR(n, __SC_DECL, __VA_ARGS__)) { \
        static const char *__name = #name;                                                                        \
        ftrace_hook_func_enter(#name);

// 结束符
#define FTRACE_HOOK_FUNC_END }

// 调用原始函数
#define FTRACE_HOOK_FUNC_ORIG(name, ...) FTRACE_HOOK_ORIG_NAME(name)(__VA_ARGS__)

/**
 * @brief 钩子返回，减少引用计数
 * @note 所有钩子中必须使用这个宏返回数据
 *
 */
#define FTRACE_HOOK_RETURN(x)          \
    do {                               \
        ftrace_hook_func_exit(__name); \
        return x;                      \
    } while (0)

#define FTRACE_HOOK_RETURN_VOID()      \
    do {                               \
        ftrace_hook_func_exit(__name); \
        return;                        \
    } while (0)

#endif  // _FTRACE_H_
```

```cpp
// ftrace_hook.c
#include "ftrace_hook.h"

// 记录当前是否启用hook功能，0表示未启用，1表示启用
atomic_t g_hook_enable = ATOMIC_INIT(0);

void enable_ftrace_hook(void) { atomic_set_release(&g_hook_enable, 1); }

void disable_ftrace_hook(void) { atomic_set_release(&g_hook_enable, 0); }

bool is_ftrace_hook_enabled(void) { return atomic_read_acquire(&g_hook_enable) == 1; }

atomic_t g_running_hooks = ATOMIC_INIT(0);

/**
 * @brief 中转函数，在每次调用hook函数前调用，如果regs->ip被修改，则调用修改后的函数，否则调用原始函数
 *
 */
static void notrace ftrace_hook_trampoline(unsigned long ip, unsigned long parent_ip, struct ftrace_ops *ops,
                                           struct pt_regs *regs) {
    struct ftrace_hook *hook = container_of(ops, struct ftrace_hook, ops);
    ftrace_hook_func_enter("ftrace_hook_trampoline");

    if (hook->replacement) {
        // 修改调用自己的函数
        instruction_pointer_set(regs, (unsigned long)hook->replacement);
    }

    ftrace_hook_func_exit("ftrace_hook_trampoline");
}

static int hook_by_ftrace(struct ftrace_hook *hook) {
    int ret;

    // 查找符号
    hook->_address = kallsyms_lookup_name(hook->name);
    if (!hook->_address) {
        HOOK_LOG_WARN("Failed to resolve %s address", hook->name);
        return -ENOENT;
    }

    // 跳过开头的 ftrace entry 指令，避免再次进入
    if (hook->original) {
        *(hook->original) = (void *)(hook->_address + MCOUNT_INSN_SIZE);
    }

    hook->ops.func = ftrace_hook_trampoline;
    // FTRACE_OPS_FL_SAVE_REGS: 需要访问参数
    // FTRACE_OPS_FL_RECURSION_SAFE: 我们自己处理重入，减少性能损失
    // FTRACE_OPS_FL_IPMODIFY: 我们需要修改 IP 寄存器
    hook->ops.flags = FTRACE_OPS_FL_SAVE_REGS | FTRACE_OPS_FL_RECURSION_SAFE | FTRACE_OPS_FL_IPMODIFY;

    // 此函数支持符号名唯一的hook，如果存在多个函数同一个符号则需要使用ftrace_set_filter_ip来进行处理
    ret = ftrace_set_filter(&hook->ops, (unsigned char *)hook->name, strlen(hook->name), 0);
    if (ret < 0) {
        HOOK_LOG_WARN("Failed to set ftrace ip filter(%s, 0x%p): %d", hook->name, (void *)hook->_address, ret);
        return ret;
    }

    ret = register_ftrace_function(&hook->ops);
    if (ret < 0) {
        // 清理
        ftrace_set_notrace(&hook->ops, (unsigned char *)hook->name, strlen(hook->name), 0);
        HOOK_LOG_WARN("Failed to register ftrace function(%s): %d", hook->name, ret);
        return ret;
    }

    return 0;
}

static void unhook_by_ftrace(struct ftrace_hook *hook) {
    int ret;
    ret = unregister_ftrace_function(&hook->ops);
    if (ret < 0) {
        HOOK_LOG_WARN("Failed to unregister ftrace function(%s): %d", hook->name, ret);
    }

    ret = ftrace_set_notrace(&hook->ops, (unsigned char *)hook->name, strlen(hook->name), 0);
    if (ret < 0) {
        HOOK_LOG_WARN("Failed to remove ftrace ip filter(%s, 0x%p): %d", hook->name, (void *)hook->_address, ret);
    }
}

static int ftrace_hook_register(struct ftrace_hook *hook) {
    if (!hook || !hook->name || !hook->name[0] || !hook->replacement) {
        return -EINVAL;
    }

    return hook_by_ftrace(hook);
}

static void ftrace_hook_unregister(struct ftrace_hook *hook) {
    if (!hook || !hook->name || !hook->name[0]) {
        return;
    }

    unhook_by_ftrace(hook);
}

/**
 * @brief 注册多个
 *
 * @param hooks
 * @param count
 * @return int 0 表示全部成功，否则返回 -errno
 */
int ftrace_hook_multi_register(struct ftrace_hook hooks[], size_t count) {
    int ret = 0;
    int i = 0;

    if (unlikely(hooks == NULL)) {
        return -EINVAL;
    }

    for (; i < count; ++i) {
        ret = ftrace_hook_register(hooks + i);
        if (ret < 0) {
            HOOK_LOG_WARN("Failed to register hook(%s): %d", hooks[i].name, ret);
            goto failed;
        }
    }

    return 0;

failed:
    for (--i; i >= 0; --i) {
        ftrace_hook_unregister(hooks + i);
    }
    return ret;
}

/**
 * @brief 注销多个
 *
 * @param hooks
 * @param count
 */
void ftrace_hook_multi_unregister(struct ftrace_hook hooks[], size_t count) {
    int i = (int)count;
    if (unlikely(hooks == NULL)) {
        return;
    }
    for (--i; i >= 0; --i) {
        ftrace_hook_unregister(hooks + i);
    }
}
```

### 1.3. 使用示例

```cpp
// main.c
#include "ftrace_hook.h"

// hook tcp_established_options
// 下面的宏定义了需要赋值的原函数指针并声明了替换的函数，在函数开头会添加引用计数
FTRACE_HOOK_FUNC_REPLACE(4, tcp_established_options, unsigned int, struct sock *, sk, struct sk_buff *, skb,
                         struct tcp_out_options *, opts, struct tcp_md5sig_key **, md5) {
    unsigned int size = 0;
    // 调用原函数
    size = FTRACE_HOOK_FUNC_ORIG(tcp_established_options, sk, skb, opts, md5);
    // do something
    FTRACE_HOOK_RETURN(size);   // 使用宏进行返回，会将引用计数减一
}
FTRACE_HOOK_FUNC_END

static struct ftrace_hook toa_hooks[] = {
    FTRACE_HOOK_STRUCT(tcp_established_options),
};

int toa_init(void) {
    int ret;
    ret = ftrace_hook_multi_register(toa_hooks, ARRAY_SIZE(toa_hooks));

    if (ret) {
        // do something
        goto hook_err;
    }

    // 上面只是注册，需要下面的调用来启动hook函数调用
    enable_ftrace_hook();
    return 0;
hook_err:
    return ret;
}

void toa_exit(void) {
    int running_hooks;

    disable_ftrace_hook();  // 非必要，不调也可以卸载
    ftrace_hook_multi_unregister(toa_hooks, ARRAY_SIZE(toa_hooks));

    // 下面的处理防止驱动退出后，已经调用到hook函数内部的函数返回到非法内存地址
    // 这里等待引用计数减到0后再退出释放内存
    while ((running_hooks = atomic_read_acquire(&g_running_hooks))) {
        SDP_LOG_INFO("waiting for running hooks %d", running_hooks);
        msleep(1);
    }
}

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("ftrace test");
MODULE_AUTHOR("xxx");
module_init(toa_init);
module_exit(toa_exit);
```
