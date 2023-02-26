---
weight: 2571
title: "2571. Minimum Operations to Reduce an Integer to 0"
---

# 题目

You are given a positive integer n, you can do the following operation any number of times:

- Add or subtract a power of 2 from n.

Return the minimum number of operations to make n equal to 0.

A number x is power of 2 if $x == 2^i$ where i >= 0.

Example 1:

```
Input: n = 39
Output: 3
Explanation: We can do the following operations:
- Add 2^0 = 1 to n, so now n = 40.
- Subtract 2^3 = 8 from n, so now n = 32.
- Subtract 2^5 = 32 from n, so now n = 0.
It can be shown that 3 is the minimum number of operations we need to make n equal to 0.
```

Example 2:

```
Input: n = 54
Output: 3
Explanation: We can do the following operations:
- Add 2^1 = 2 to n, so now n = 56.
- Add 2^3 = 8 to n, so now n = 64.
- Subtract 26 = 64 from n, so now n = 0.
So the minimum number of operations is 3.
```

Constraints:

- $1 <= n <= 10^5$

# 思路1 数学分析

## 分析

- 连续的1可以用加再减消除，分析一下就会发现
    - 01要减一次
    - 011要么减两次，要么加一次减一次，同样两次
    - 011111加一次减一次，两次
- 也就是说，超过1个连续的1都是两次解决
- 那么超过1次的1可以转成加一剩一个1未消除

## 代码

```go
func minOperations(n int) int {
	result := 0
	count := 0
	for n > 0 {
		if n&1 == 1 {
			count++
			n >>= 1
			continue
		}
		n >>= 1
		if count == 0 {
			continue
		}
		// 超过1个的1转成加1，剩余一个1
		// 只有1个1，就只加一消掉
		result++
		if count == 1 {
			count = 0
		} else {
			count = 1
		}
	}
	if count > 2 {
		result += 2
	} else {
		result += count
	}

	return result
}
```
