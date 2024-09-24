---
weight: 327
title: "327. Count of Range Sum"
---

# 题目

Given an integer array nums and two integers lower and upper, return the number of range sums that lie in [lower, upper] inclusive.

Range sum S(i, j) is defined as the sum of the elements in nums between indices i and j inclusive, where i <= j.

Example 1:

```
Input: nums = [-2,5,-1], lower = -2, upper = 2
Output: 3
Explanation: The three ranges are: [0,0], [2,2], and [0,2] and their respective sums are: -2, -1, 2.
```

Example 2:

```
Input: nums = [0], lower = 0, upper = 0
Output: 1
```

Constraints:

- $1 <= nums.length <= 10^5$
- $-2^{31} <= nums[i] <= 2^{31} - 1$
- $-10^5 <= lower <= upper <= 10^5$
- The answer is guaranteed to fit in a 32-bit integer.

# 思路1 线段树

## 分析

- 先把问题转化一下，求某个区间和，使用前缀和进行简化。区间和变成端点之间的差，问题转化为对于固定右端点j，在`[0, j)`之间找符合`lower <= preSum[j]-preSum[i] <= upper`
- 转成，在`[0, j)`找`preSum[j]-upper <= preSum[i] <= preSum[j]-lower`的数量

## 代码

```go
func min(a, b int) int {
	if a > b {
		return b
	}
	return a
}

func paintWalls(cost []int, time []int) int {
	n := len(cost)

	mMap := make([]map[int]int, n)
	for i := range mMap {
		mMap[i] = make(map[int]int)
	}
	// 选和不选代价和时间花费不一样，可以认为付费的时间和花费是正的，免费的时间是负的，花费为0
	// 最终求得是时间不为负数的花费最小值
	var dfs func(i, t int) int
	dfs = func(i, t int) int {
		if t > i {
			return 0
		}
		if i < 0 {
			return math.MaxInt / 2
		}
		if mMap[i][t] > 0 {
			return mMap[i][t]
		}
		// 为当前免费和当前不免费的最小值
		res := min(dfs(i-1, t-1), dfs(i-1, t+time[i])+cost[i])
		mMap[i][t] = res
		return res
	}
	return dfs(n-1, 0)
}
```
