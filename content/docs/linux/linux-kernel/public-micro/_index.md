---
title: "公共宏的一些定义"
---

# BIT(nr)

```cpp
// include/vdso/bits.h
/* SPDX-License-Identifier: GPL-2.0 */
#ifndef __VDSO_BITS_H
#define __VDSO_BITS_H

#include <vdso/const.h>

#define BIT(nr)			(UL(1) << (nr))

#endif	/* __VDSO_BITS_H */
```

# get_user(x, ptr)

- 每个架构有自己的定义
- 本身是给获取当前指针类型的值
- 用法如下

```cpp
void xxx(const char __user *buffer) {
    char mode;
    // 宏实现，mode直接传就好，不需要取地址，返回0就是成功，返回非0就是失败
    // 从对应类型的用户空间指针取值赋值给内部变量，数组取第一个，非数组直接取值
    // 只支持1、2、4、8个字节的特定类型，不支持字符串
    if (get_user(mode, buffer)) return;
    // do something
}
```

- 内核定义

```cpp
// include/asm-generic/uaccess.h
#define __get_user(x, ptr)					\
({								\
	int __gu_err = -EFAULT;					\
	__chk_user_ptr(ptr);					\
	switch (sizeof(*(ptr))) {				\
	case 1: {						\
		unsigned char __x = 0;				\
		__gu_err = __get_user_fn(sizeof (*(ptr)),	\
					 ptr, &__x);		\
		(x) = *(__force __typeof__(*(ptr)) *) &__x;	\
		break;						\
	};							\
	case 2: {						\
		unsigned short __x = 0;				\
		__gu_err = __get_user_fn(sizeof (*(ptr)),	\
					 ptr, &__x);		\
		(x) = *(__force __typeof__(*(ptr)) *) &__x;	\
		break;						\
	};							\
	case 4: {						\
		unsigned int __x = 0;				\
		__gu_err = __get_user_fn(sizeof (*(ptr)),	\
					 ptr, &__x);		\
		(x) = *(__force __typeof__(*(ptr)) *) &__x;	\
		break;						\
	};							\
	case 8: {						\
		unsigned long long __x = 0;			\
		__gu_err = __get_user_fn(sizeof (*(ptr)),	\
					 ptr, &__x);		\
		(x) = *(__force __typeof__(*(ptr)) *) &__x;	\
		break;						\
	};							\
	default:						\
		__get_user_bad();				\
		break;						\
	}							\
	__gu_err;						\
})

#define get_user(x, ptr)					\
({								\
	const void __user *__p = (ptr);				\
	might_fault();						\
	access_ok(VERIFY_READ, __p, sizeof(*ptr)) ?		\
		__get_user((x), (__typeof__(*(ptr)) __user *)__p) :\
		((x) = (__typeof__(*(ptr)))0,-EFAULT);		\
})

#ifndef __get_user_fn
static inline int __get_user_fn(size_t size, const void __user *ptr, void *x)
{
	return unlikely(raw_copy_from_user(x, ptr, size)) ? -EFAULT : 0;
}

#define __get_user_fn(sz, u, k)	__get_user_fn(sz, u, k)

#endif
```

# bool

- `_Bool`是c99添加进来的一个关键字，内核将其重命名为bool

```cpp
// include/linux/types.h
typedef _Bool			bool;

// include/linux/stddef.h
enum {
	false	= 0,
	true	= 1
};
```

# NULL

```cpp
// include/linux/stddef.h
#undef NULL
#define NULL ((void *)0)
```

# __init

```cpp
// include/linux/init.h
#define __init		__section(".init.text") __cold  __latent_entropy __noinitretpoline __nocfi
#define __initdata	__section(".init.data")
#define __initconst	__section(".init.rodata")
#define __exitdata	__section(".exit.data")
#define __exit_call	__used __section(".exitcall.exit")
...
#define __ref            __section(".ref.text") noinline
#define __refdata        __section(".ref.data")
#define __refconst       __section(".ref.rodata")
#define __exit          __section(".exit.text") __exitused __cold notrace
...
/* Used for MEMORY_HOTPLUG */
#define __meminit        __section(".meminit.text") __cold notrace \
						  __latent_entropy
#define __meminitdata    __section(".meminit.data")
#define __meminitconst   __section(".meminit.rodata")
#define __memexit        __section(".memexit.text") __exitused __cold notrace
#define __memexitdata    __section(".memexit.data")
#define __memexitconst   __section(".memexit.rodata")
```

# HZ 时钟频率

- 由配置决定时钟的频率

```cpp
// include/asm-generic/param.h
# undef HZ
# define HZ		CONFIG_HZ	/* Internal kernel timer frequency */
```
