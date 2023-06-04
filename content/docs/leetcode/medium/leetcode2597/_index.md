---
weight: 2597
title: "2597. The Number of Beautiful Subsets"
---

# 题目

You are given an array nums of positive integers and a positive integer k.

A subset of nums is beautiful if it does not contain two integers with an absolute difference equal to k.

Return the number of non-empty beautiful subsets of the array nums.

A subset of nums is an array that can be obtained by deleting some (possibly none) elements from nums. Two subsets are different if and only if the chosen indices to delete are different.

Example 1:

```
Input: nums = [2,4,6], k = 2
Output: 4
Explanation: The beautiful subsets of the array nums are: [2], [4], [6], [2, 6].
It can be proved that there are only 4 beautiful subsets in the array [2,4,6].
```

Example 2:

```
Input: nums = [1], k = 1
Output: 1
Explanation: The beautiful subset of the array nums is [1].
It can be proved that there is only 1 beautiful subset in the array [1].
```

Constraints:

- 1 <= nums.length <= 20
- 1 <= nums[i], k <= 1000

# 思路1 枚举

## 分析

- 使用hash表存储是否选了某个数，然后直接枚举

## 代码

```go
func beautifulSubsets(nums []int, k int) int {
	result := make(map[int]int)
	res := 0
	n := len(nums)
	var dfs func(i int)
	dfs = func(i int) {
		if i == n {
			res++
			return
		}
		// 不选
		dfs(i + 1)
		v := nums[i]
		if result[v-k] > 0 || result[v+k] > 0 {
			// 存在间隔为k的数
			return
		}
		// 可以选就选一下
		result[v]++
		dfs(i + 1)
		result[v]--
	}
	dfs(0)
	return res - 1 // 去除空集
}
```

# 思路2 分组+打家劫舍

## 分析

- 分成公差为k的等差数列，看有多少组
- 相邻的不能选，非相邻的可以选，那么就是打家劫舍的变形

## 代码

```go
func beautifulSubsets1(nums []int, k int) int {
	grp := make([]map[int]int, k)
	for _, v := range nums {
		i := v % k
		if grp[i] == nil {
			grp[i] = map[int]int{}
		}
		grp[i][v]++
	}

	res := 1
	type pair struct {
		x, cnt int
	}
	for _, v := range grp {
		if len(v) == 0 {
			continue
		}

		arr := make([]pair, 0, len(v))
		for k, val := range v {
			arr = append(arr, pair{x: k, cnt: val})
		}
		sort.Slice(arr, func(i, j int) bool { return arr[i].x < arr[j].x })

		// 打家劫舍，选和不选分开统计
		ch, nch := 1<<arr[0].cnt-1, 1
		for i := 1; i < len(arr); i++ {
			ch1 := 1<<arr[i].cnt - 1	// 当前选的方案数
			if arr[i].x-k == arr[i-1].x {
				ch1 *= nch	// 相差为k，当前选的只能是前一个不选的数量乘以选的方案数
			} else {
				ch1 *= (ch + nch)	// 相差不是k，那么当前选的方案数就是前一个选和不选一起乘以当前的方案数
			}
			nch = ch + nch	// 不选的一定是前一个选和不选相加
			ch = ch1
		}
		res *= (ch + nch)
	}
	return res - 1 // 去除空集
}
```