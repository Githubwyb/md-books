---
title: "bit_spinlock"
---

# 一、前言

bit_spinlock是内核里面比较原始的一种自旋锁的实现，只有0和1两种状态。使用原子操作TAS（test and set）来抢锁，线程之间无序抢锁，并不公平。

# 二、使用实例

```cpp
void test_hash(void) {
    unsigned long lock = 0;
    printk("lock: %lu, lock ptr: %pK\n", lock, &lock);      // lock: 0, lock ptr: 0xffffaaabbb

    // 使用变量第一位作为锁，锁了之后lock的值的第一位被设置为1
    bit_spin_lock(0, &lock);
    // 尝试申请锁，不阻塞，申请到返回true，否则返回false
    t = bit_spin_trylock(0, &lock);
    printk("entry: %lu, %pK, try %d\n", lock, &lock, t);    // lock: 1, lock ptr: 0xffffaaabbb, 0

    // 解锁
    bit_spin_unlock(0, &lock);
    t = bit_spin_trylock(0, &lock);
    printk("entry: %lu, %pK, try %d\n", lock, &lock, t);    // lock: 1, lock ptr: 0xffffaaabbb, 0

    return;
}
```

# 三、具体实现

## 1. bit_spin_lock

就是最简单的test_and_set，将addr作为原子变量的指针操作

```cpp
// include/linux/bit_spinlock.h
/*
 *  bit-based spin_lock()
 *
 * Don't use this unless you really need to: spin_lock() and spin_unlock()
 * are significantly faster.
 */
static inline void bit_spin_lock(int bitnum, unsigned long *addr)
{
	/*
	 * Assuming the lock is uncontended, this never enters
	 * the body of the outer loop. If it is contended, then
	 * within the inner loop a non-atomic test is used to
	 * busywait with less bus contention for a good time to
	 * attempt to acquire the lock bit.
	 */
	preempt_disable();
#if defined(CONFIG_SMP) || defined(CONFIG_DEBUG_SPINLOCK)
	while (unlikely(test_and_set_bit_lock(bitnum, addr))) {
		preempt_enable();
		do {
			cpu_relax();
		} while (test_bit(bitnum, addr));
		preempt_disable();
	}
#endif
	__acquire(bitlock);
}

// include/asm-generic/bitops/lock.h
/**
 * test_and_set_bit_lock - Set a bit and return its old value, for lock
 * @nr: Bit to set
 * @addr: Address to count from
 *
 * This operation is atomic and provides acquire barrier semantics if
 * the returned value is 0.
 * It can be used to implement bit locks.
 */
static inline int test_and_set_bit_lock(unsigned int nr,
					volatile unsigned long *p)
{
	long old;
	unsigned long mask = BIT_MASK(nr);

	p += BIT_WORD(nr);
	if (READ_ONCE(*p) & mask)
		return 1;

	old = atomic_long_fetch_or_acquire(mask, (atomic_long_t *)p);
	return !!(old & mask);
}
```

## 2. bit_spin_trylock

```cpp
// include/linux/bit_spinlock.h
/*
 * Return true if it was acquired
 */
static inline int bit_spin_trylock(int bitnum, unsigned long *addr)
{
	preempt_disable();
#if defined(CONFIG_SMP) || defined(CONFIG_DEBUG_SPINLOCK)
	if (unlikely(test_and_set_bit_lock(bitnum, addr))) {
		preempt_enable();
		return 0;
	}
#endif
	__acquire(bitlock);
	return 1;
}
```

## 3. bit_spin_unlock

```cpp
// include/linux/bit_spinlock.h
/*
 *  bit-based spin_unlock()
 */
static inline void bit_spin_unlock(int bitnum, unsigned long *addr)
{
#ifdef CONFIG_DEBUG_SPINLOCK
	BUG_ON(!test_bit(bitnum, addr));
#endif
#if defined(CONFIG_SMP) || defined(CONFIG_DEBUG_SPINLOCK)
	clear_bit_unlock(bitnum, addr);
#endif
	preempt_enable();
	__release(bitlock);
}
```

## 4. bit_spin_is_locked

```cpp
// include/linux/bit_spinlock.h
/*
 * Return true if the lock is held.
 */
static inline int bit_spin_is_locked(int bitnum, unsigned long *addr)
{
#if defined(CONFIG_SMP) || defined(CONFIG_DEBUG_SPINLOCK)
	return test_bit(bitnum, addr);
#elif defined CONFIG_PREEMPT_COUNT
	return preempt_count();
#else
	return 1;
#endif
}
```
