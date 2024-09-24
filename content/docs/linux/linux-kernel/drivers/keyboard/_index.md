---
title: "键盘驱动"
---

# 一、前言

本节讲解键盘输入在linux里面的处理，包括键值定义等

# 二、中断

键盘中断是1，在Linux源码里面注册如下

```cpp
// drivers/input/serio/i8042-io.h
/*
 * IRQs.
 */

#ifdef __alpha__
# define I8042_KBD_IRQ	1
# define I8042_AUX_IRQ	(RTC_PORT(0) == 0x170 ? 9 : 12)	/* Jensen is special */
#elif defined(__arm__)
/* defined in include/asm-arm/arch-xxx/irqs.h */
#include <asm/irq.h>
#elif defined(CONFIG_PPC)
extern int of_i8042_kbd_irq;
extern int of_i8042_aux_irq;
# define I8042_KBD_IRQ  of_i8042_kbd_irq
# define I8042_AUX_IRQ  of_i8042_aux_irq
#else
# define I8042_KBD_IRQ	1
# define I8042_AUX_IRQ	12
#endif

// drivers/input/serio/i8042.c
static int i8042_setup_kbd(void)
{
	int error;

	error = i8042_create_kbd_port();
	if (error)
		return error;

	error = request_irq(I8042_KBD_IRQ, i8042_interrupt, IRQF_SHARED,
			    "i8042", i8042_platform_device);
	if (error)
		goto err_free_port;

	error = i8042_enable_kbd_port();
	if (error)
		goto err_free_irq;

	i8042_kbd_irq_registered = true;
	return 0;

 err_free_irq:
	free_irq(I8042_KBD_IRQ, i8042_platform_device);
 err_free_port:
	i8042_free_kbd_port();
	return error;
}
```

# 三、键值解析

键值的宏定义如下

```cpp
// include/uapi/linux/input-event-codes.h
#define KEY_RESERVED		0
#define KEY_ESC			1
#define KEY_1			2
#define KEY_2			3
#define KEY_3			4
#define KEY_4			5
...
```
