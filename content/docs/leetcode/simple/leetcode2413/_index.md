---
weight: 2413
title: "2413. Smallest Even Multiple"
---

# 题目

Given a positive integer n, return the smallest positive integer that is a multiple of both 2 and n.

Example 1:
- Input: n = 5
- Output: 10
- Explanation: The smallest multiple of both 5 and 2 is 10.

Example 2:
- Input: n = 6
- Output: 6
- Explanation: The smallest multiple of both 6 and 2 is 6. Note that a number is a multiple of itself.



Constraints:
   - $1 \le n \le 150$


# 思路1 数学思想

## 分析

- 就是一道数学题，奇数乘以2，偶数就是本身

## 代码实现

```go
func smallestEvenMultiple(n int) int {
	if n % 2 == 0 {
		return n
	}
	return 2 * n
}
```
