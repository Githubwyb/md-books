---
weight: 322
title: "- 322. Coin Change"
---

# 题目

You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.

# 思路1

## 分析

- 自己想的记忆化搜索，假设凑够钱数为n的最小硬币数为 $f(n)$

$$
f(n) = \left\\{
\begin{array}{ll}
    1        & n == coins[i]  \\\\
    MaxInt   & n < coins[i]   \\\\
    \min(f(n-coins[0]), f(n-coins[1]...)) + 1 & other
\end{array}
\right.
$$

## 代码实现

```go
func getMinCount(coins []int, amount int, amountMap []int) int {
	if amount < 0 {
		return -1
	}
	if amount == 0 {
		return 0
	}
	if amountMap[amount] != 0 {
		return amountMap[amount]
	}

	// 根据coins遍历，取所有方案最小的
	minCount := -1
	for i := len(coins); i > 0; i-- {
		if amount < coins[i-1] {
			continue
		}
		if amount == coins[i-1] {
			amountMap[amount] = 1
			return 1
		}
		tmp := getMinCount(coins, amount-coins[i-1], amountMap)
		if tmp < 0 {
			continue
		}
		if minCount < 0 {
			minCount = tmp
			continue
		}
		if tmp < minCount {
			minCount = tmp
		}
	}
	if minCount >= 0 {
		amountMap[amount] = minCount + 1
		return minCount + 1
	}
	amountMap[amount] = -1
	return -1
}
```

# 思路2

## 分析

- 记忆化搜索转换一下思路就是动态规划，从0开始计算，一直计算到amount

## 代码实现

```go
func min(a, b int) int {
	if a > b {
		return b
	}
	return a
}

func coinChange1(coins []int, amount int) int {
	if amount == 0 {
		return 0
	}
	amountMap := make([]int, amount+1)
	for i := 1; i <= amount; i++ {
		amountMap[i] = math.MaxInt
		for _, v := range coins {
			if i < v {
				continue
			}
			amountMap[i] = min(amountMap[i]-1, amountMap[i-v]) + 1
		}
	}
	if amountMap[amount] == math.MaxInt {
		return -1
	}
	return amountMap[amount]
}
```
