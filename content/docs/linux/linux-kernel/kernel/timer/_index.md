---
title: "内核计时和定时器"
---

# 一、前言

内核里面计时使用的是jiffies变量，对用户态就是获取系统启动时间。获取系统启动时间也是根据jiffies进行换算得来。这里介绍一下内核里面的jiffies和计时系统。

# 二、使用实例

## 1. timer_list&jiffies 定时器使用

```cpp
#include <linux/jiffies.h>
#include <linux/timer.h>

static int toav6_expire_time = 5 * 60;  // 默认过期时间5分钟
module_param(toav6_expire_time, int, S_IRUGO);
#define EXPIRE_TIME_JIFFIES (msecs_to_jiffies(toav6_expire_time * 1000))
#define TIMER_INTERVAL EXPIRE_TIME_JIFFIES  // 使用过期时间作为定时器间隔

static struct timer_list toa_timer;

static void toa_timer_callback(struct timer_list *timer) {
    // do something

    // Re-arm the timer
    mod_timer(timer, jiffies + TIMER_INTERVAL);
}

bool toa_timer_init(void) {
    static const char *tag = __FUNCTION__;
    LOG_INFO("%s, init timer, intervel %d s", tag, toav6_expire_time);
    // Initialize the timer
    timer_setup(&toa_timer, toa_timer_callback, 0);

    // Set the timer to fire in 5 minutes
    return mod_timer(&toa_timer, jiffies + TIMER_INTERVAL);
}

void toa_timer_exit(void) {
    del_timer(&toa_timer);
}
```

# 三、jiffies定义

头文件引用的是extern变量

```cpp
// include/linux/jiffies.h
/*
 * The 64-bit value is not atomic - you MUST NOT read it
 * without sampling the sequence number in jiffies_lock.
 * get_jiffies_64() will do this for you as appropriate.
 */
extern u64 __cacheline_aligned_in_smp jiffies_64;
extern unsigned long volatile __cacheline_aligned_in_smp __jiffy_arch_data jiffies;
```

源文件里面定义对应的jiffies_64

```cpp
// kernel/time/timer.c
__visible u64 jiffies_64 __cacheline_aligned_in_smp = INITIAL_JIFFIES;

EXPORT_SYMBOL(jiffies_64);
```

在汇编代码里面将两个变量的地址指定为同一个，实际上就是同一个变量，可能在32位系统中使用的是低32位

```assembly
// arch/x86/kernel/vmlinux.lds.S
jiffies = jiffies_64;
```

# 三、jiffies的更新

```cpp
// kernel/time/tick-sched.c

/* 调用到此的堆栈
tick_do_update_jiffies64(ktime_t now) (kernel/time/tick-sched.c:118)
tick_do_update_jiffies64(ktime_t now) (kernel/time/tick-sched.c:57)
tick_nohz_update_jiffies(ktime_t now) (kernel/time/tick-sched.c:634)
tick_nohz_irq_enter() (kernel/time/tick-sched.c:1438)
tick_irq_enter() (kernel/time/tick-sched.c:1455)
sysvec_apic_timer_interrupt(struct pt_regs * regs) (arch/x86/kernel/apic/apic.c:1106)
*/
/*
 * Must be called with interrupts disabled !
 */
static void tick_do_update_jiffies64(ktime_t now)
{
	unsigned long ticks = 1;
	ktime_t delta, nextp;

	/*
	 * 64bit can do a quick check without holding jiffies lock and
	 * without looking at the sequence count. The smp_load_acquire()
	 * pairs with the update done later in this function.
	 *
	 * 32bit cannot do that because the store of tick_next_period
	 * consists of two 32bit stores and the first store could move it
	 * to a random point in the future.
	 */
	if (IS_ENABLED(CONFIG_64BIT)) {
		if (ktime_before(now, smp_load_acquire(&tick_next_period)))
			return;
	} else {
		unsigned int seq;

		/*
		 * Avoid contention on jiffies_lock and protect the quick
		 * check with the sequence count.
		 */
		do {
			seq = read_seqcount_begin(&jiffies_seq);
			nextp = tick_next_period;
		} while (read_seqcount_retry(&jiffies_seq, seq));

		if (ktime_before(now, nextp))
			return;
	}

	/* Quick check failed, i.e. update is required. */
	raw_spin_lock(&jiffies_lock);
	/*
	 * Reevaluate with the lock held. Another CPU might have done the
	 * update already.
	 */
	if (ktime_before(now, tick_next_period)) {
		raw_spin_unlock(&jiffies_lock);
		return;
	}

	write_seqcount_begin(&jiffies_seq);

	delta = ktime_sub(now, tick_next_period);
	if (unlikely(delta >= TICK_NSEC)) {
		/* Slow path for long idle sleep times */
		s64 incr = TICK_NSEC;

		ticks += ktime_divns(delta, incr);

		last_jiffies_update = ktime_add_ns(last_jiffies_update,
						   incr * ticks);
	} else {
		last_jiffies_update = ktime_add_ns(last_jiffies_update,
						   TICK_NSEC);
	}

	/* Advance jiffies to complete the jiffies_seq protected job */
    // 在这里完成对jiffies_64的新增
	jiffies_64 += ticks;

	/*
	 * Keep the tick_next_period variable up to date.
	 */
	nextp = ktime_add_ns(last_jiffies_update, TICK_NSEC);

	if (IS_ENABLED(CONFIG_64BIT)) {
		/*
		 * Pairs with smp_load_acquire() in the lockless quick
		 * check above and ensures that the update to jiffies_64 is
		 * not reordered vs. the store to tick_next_period, neither
		 * by the compiler nor by the CPU.
		 */
		smp_store_release(&tick_next_period, nextp);
	} else {
		/*
		 * A plain store is good enough on 32bit as the quick check
		 * above is protected by the sequence count.
		 */
		tick_next_period = nextp;
	}

	/*
	 * Release the sequence count. calc_global_load() below is not
	 * protected by it, but jiffies_lock needs to be held to prevent
	 * concurrent invocations.
	 */
	write_seqcount_end(&jiffies_seq);

	calc_global_load();

	raw_spin_unlock(&jiffies_lock);
	update_wall_time();
}
```
