---
title: "定时器设定"
---

# 一、前言

一般IRQ0作为定时器中断，cpu有一个旁路芯片或者内置触发此中断。

# 二、定时器中断设置

```cpp
// arch/x86/kernel/time.c
/*
 * Default timer interrupt handler for PIT/HPET
 */
static irqreturn_t timer_interrupt(int irq, void *dev_id)
{
	global_clock_event->event_handler(global_clock_event);
	return IRQ_HANDLED;
}

static void __init setup_default_timer_irq(void)
{
	unsigned long flags = IRQF_NOBALANCING | IRQF_IRQPOLL | IRQF_TIMER;

	/*
	 * Unconditionally register the legacy timer interrupt; even
	 * without legacy PIC/PIT we need this for the HPET0 in legacy
	 * replacement mode.
	 */
	if (request_irq(0, timer_interrupt, flags, "timer", NULL))
		pr_info("Failed to register legacy timer interrupt\n");
}

/* Default timer init function */
void __init hpet_time_init(void)
{
	if (!hpet_enable()) {
		if (!pit_timer_init())
			return;
	}

	setup_default_timer_irq();
}
```

# 三、定时器芯片设置

## 1. 定时器芯片频率和计数器相关计算

芯片频率定义如下

```cpp
// include/linux/timex.h
/* The clock frequency of the i8253/i8254 PIT */
#define PIT_TICK_RATE 1193182ul
```

根据CONFIG_HZ计算出要设置到定时器的计数器的值

```cpp
// include/linux/i8253.h
#define PIT_LATCH	((PIT_TICK_RATE + HZ/2) / HZ)
```

## 2. 设置i8253的PIT

```cpp
// include/linux/i8253.h
/* i8253A PIT registers */
#define PIT_MODE	0x43
#define PIT_CH0		0x40
#define PIT_CH2		0x42

// drivers/clocksource/i8253.c
static int pit_set_periodic(struct clock_event_device *evt)
{
	raw_spin_lock(&i8253_lock);

	/* binary, mode 2, LSB/MSB, ch 0 */
	outb_p(0x34, PIT_MODE);
	outb_p(PIT_LATCH & 0xff, PIT_CH0);	/* LSB */
	outb_p(PIT_LATCH >> 8, PIT_CH0);	/* MSB */

	raw_spin_unlock(&i8253_lock);
	return 0;
}
```
