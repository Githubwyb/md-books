---
weight: 6447
title: "6447. Painting the Walls"
---

# 题目

You are given two 0-indexed integer arrays, cost and time, of size n representing the costs and the time taken to paint n different walls respectively. There are two painters available:

A paid painter that paints the ith wall in time[i] units of time and takes cost[i] units of money.
A free painter that paints any wall in 1 unit of time at a cost of 0. But the free painter can only be used if the paid painter is already occupied.
Return the minimum amount of money required to paint the n walls.

Example 1:

```
Input: cost = [1,2,3,2], time = [1,2,3,2]
Output: 3
Explanation: The walls at index 0 and 1 will be painted by the paid painter, and it will take 3 units of time; meanwhile, the free painter will paint the walls at index 2 and 3, free of cost in 2 units of time. Thus, the total cost is 1 + 2 = 3.
```

Example 2:

```
Input: cost = [2,3,4,2], time = [1,1,1,1]
Output: 4
Explanation: The walls at index 0 and 3 will be painted by the paid painter, and it will take 2 units of time; meanwhile, the free painter will paint the walls at index 1 and 2, free of cost in 2 units of time. Thus, the total cost is 2 + 2 = 4.
```

Constraints:

- 1 <= cost.length <= 500
- cost.length == time.length
- $1 <= cost[i] <= 10^6$
- 1 <= time[i] <= 500

# 思路1

## 分析 记忆化搜索

- 选了，时间为正，花费为正；不选，时间为-1，花费为0
- 要求的是时间不为负时，花费最小值
- 再有，设`f(i, j)`为前i面墙在j的时间下，时间不为负花费最小的值，那么

$$
f(i, j) = min(f(i-1, j-1), f(i-1, j+time[i])+cost[i])
$$

- 中间可能i和j相同的数会重复计算，加一个map进行保存，整体就是一个记忆化搜索的过程

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

# 思路2 递推

## 分析

$$
f_i(t) = min\{f_{i-1}(t-1), f_{i-1}(t+time[i])+cost[i]\}
$$

- 递推公式如上，第i（从0开始）面墙的t的最小值为后面的全部都免费即`i+1-n`，t最大值只需要取到t超过前面的墙数`i+1`即可，大于或等于的一定是0
- 初始值`i=-1`，没有墙的时候，`[-n,0)`设置很大的花费，`[0,n]`都是0
- 整体偏移n，那么t的最小值为`i+1`，最大值为`i+1+n`，初始值中`[0,n)`为很大的值，`[n,2n]`为0
- 每轮遍历n，遍历n轮，时间复杂度为 $O(n^2)$ ，空间复杂度为 $O(n)$

## 代码

```go
func paintWalls1(cost []int, time []int) int {
	n := len(cost)
	// 偏移n
	f := make([]int, 2*n+1)
	// 偏移前可以认为是[-n,0)都是超级大
	for i := 0; i < n; i++ {
		f[i] = math.MaxInt / 2
	}

	f1 := make([]int, 2*n+1)
	for i := 0; i < n; i++ {
		f1, f = f, f1
		for t := i + 1; t < n+i+1; t++ {
			f[t] = min(f1[t-1], f1[min(t+time[i], 2*n)]+cost[i])
		}
	}
	return f[n]
}
```

# 思路3 再次简化

## 分析

- 思路就是把上面的`j := i+1`变成`j := 0`
- 转成代码后去推思想有点难搞，想不通，建议不要这样写，虽然看起来简单点，但是注释都不好写也就不好维护

## 代码

```go
func paintWalls2(cost []int, time []int) int {
	n := len(cost)
	// 偏移n
	f := make([]int, 2*n+1)
	// 偏移前可以认为是[-n,0)都是超级大
	for i := 0; i < n; i++ {
		f[i] = math.MaxInt / 2
	}

	f1 := make([]int, 2*n+1)
	for i := 0; i < n; i++ {
		f1, f = f, f1
		fLen := 2*n + 1 - i - 1
		f = f[:fLen]
		for j := range f[:n] {
			f[j] = min(f1[j], f1[min(j+1+time[i], fLen-1)]+cost[i])
		}
	}
	return f[0]
}
```
