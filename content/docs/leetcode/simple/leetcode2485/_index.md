---
weight: 2485
title: "2485. Find the Pivot Integer"
---

# 题目

Given a positive integer n, find the pivot integer x such that:

- The sum of all elements between 1 and x inclusively equals the sum of all elements between x and n inclusively.

Return the pivot integer x. If no such integer exists, return -1. It is guaranteed that there will be at most one pivot index for the given input.

Example 1:

```
Input: n = 8
Output: 6
Explanation: 6 is the pivot integer since: 1 + 2 + 3 + 4 + 5 + 6 = 6 + 7 + 8 = 21.
```

Example 2:

```
Input: n = 1
Output: 1
Explanation: 1 is the pivot integer since: 1 = 1.
```

Example 3:

```
Input: n = 4
Output: -1
Explanation: It can be proved that no such integer exist.
```

Constraints:

1 <= n <= 1000

# 思路1 暴力破解

## 分析

- 用等差数列的求和公式，遍历1到n计算一下，相等就返回
- 化简求和公式可以得到 $2i^2 = n^2+n$

## 代码

```go
func pivotInteger1(n int) int {
	m := n * (n + 1) / 2
	for i := 1; i <= n; i++ {
		if i*i == m {
			return i
		}
	}
	return -1
}
```

# 思路2 双指针

## 分析

- 自己想的，不做暴力破解
- 加左边减右边，到中间的时候最终结果一定是0

## 代码

```go
func pivotInteger(n int) int {
	l, r := 1, n
	tmp := 0 // 加左边减右边
	// 两边遍历直到中间
	for l != r {
		if tmp > 0 {
			tmp -= r
			r--
		} else {
			tmp += l
			l++
		}
	}
	if tmp == 0 {
		return l
	}
	return -1
}
```

# 思路3 数学公式

## 分析

- 由思路一，直接求$x = \sqrt{\frac{n(n+1)}{2}}$
- 判断x是不是整数就好了

## 代码

```go
func pivotInteger(n int) int {
	m := n * (n + 1) / 2
	x := int(math.Sqrt(float64(m)))
	if x * x == m {
		return x
	}
	return -1
}
```
