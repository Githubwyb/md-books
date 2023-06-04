---
weight: 2400
title: "2400. Number of Ways to Reach a Position After Exactly k Steps"
---

# 题目

You are given two positive integers startPos and endPos. Initially, you are standing at position startPos on an infinite number line. With one step, you can move either one position to the left, or one position to the right.

Given a positive integer k, return the number of different ways to reach the position endPos starting from startPos, such that you perform exactly k steps. Since the answer may be very large, return it modulo $10^9 + 7$.

Two ways are considered different if the order of the steps made is not exactly the same.

Note that the number line includes negative integers.

# 思路1

## 分析

- 自己虽然想到了动态规划，但是实现的时候没有把动态规划进一步简化，直接超过时间复杂度。。。
- 直接上简化后的动态规划思路
- 这道题从数学上分析，就是给定k个空格，存在两种固定数量的棋子，一个向前，一个向后。问在这k个空格中有多少种摆法
- 那么仔细想一下就推出来，假设n为向前的棋子数，k为空格数，有

$$
f(n, k) = f(n, k-1) + f(n-1, k-1)
$$

- 也就是，第一个棋子直接落到第一个位置，剩下的就是`n-1`和`k-1`，或者第一个不落这个棋子，就是`n`和`k-1`
- 边界条件，`n == k`为1，`n == 1`为k

## 代码实现

- 数组中int初始化为0，那么不用关心`n == k`的情况，因为`n == k`计算的 $f(n, k-1) = 0$，而 $f(n-1, k-1)$ 追溯到 $f(1, 1) = 1$

```go
const maxSum int = 1e9 + 7

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func numberOfWays(startPos int, endPos int, k int) int {
	diff := abs(startPos - endPos)
	// 首先判断是否可达
	if k < diff {
		return 0
	}
	if k == diff {
		return 1
	}
	// 判断是否奇偶不同
	if (k % 2) != (diff % 2) {
		return 0
	}

	n := (k - diff) / 2

	dp := make([][]int, n+1)
	for i := range dp {
		dp[i] = make([]int, k+1)
	}

	for i := 1; i < k+1; i++ {
		dp[1][i] = i
		// j最大不超过i
		for j := 2; j < n+1 && j <= i; j++ {
			dp[j][i] = (dp[j][i-1] + dp[j-1][i-1]) % maxSum
		}
	}

	return dp[n][k]
}
```
