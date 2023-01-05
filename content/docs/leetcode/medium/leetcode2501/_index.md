---
weight: 2501
title: "2501. Longest Square Streak in an Array"
---

# 题目

You are given an integer array nums. A subsequence of nums is called a square streak if:

- The length of the subsequence is at least 2, and
- after sorting the subsequence, each element (except the first element) is the square of the previous number.

Return the length of the longest square streak in nums, or return -1 if there is no square streak.

A subsequence is an array that can be derived from another array by deleting some or no elements without changing the order of the remaining elements.

Example 1:

```
Input: nums = [4,3,6,16,8,2]
Output: 3
Explanation: Choose the subsequence [4,16,2]. After sorting it, it becomes [2,4,16].
- 4 = 2 * 2.
- 16 = 4 * 4.
Therefore, [4,16,2] is a square streak.
It can be shown that every subsequence of length 4 is not a square streak.
```

Example 2:

```
Input: nums = [2,3,5,6,7]
Output: -1
Explanation: There is no square streak in nums so return -1.
```

Constraints:

- $2 <= nums.length <= 10^5$
- $2 <= nums[i] <= 10^5$

# 思路1 暴力破解

## 分析

- 由于平方最多也就32次左右，所以爆破遍历的时间复杂度并不高，直接存入一个map，然后暴力遍历就好

## 代码

```go
func longestSquareStreak(nums []int) int {
	set := make(map[int]bool)
	for _, v := range nums {
		set[v] = true
	}

	ans := 1
	for _, v := range nums {
		cnt := 1
		for v *= v; set[v]; v *= v {
			cnt++
		}
		if cnt > ans {
			ans = cnt
		}
	}
	if ans == 1 {
		return -1
	}
	return ans
}
```

# 思路2 排序+哈希

## 分析

- 效率和空间占用比上面的暴力还高，大致是因为暴力循环没那么多，而排序是 $O(n\log n)$
- 从最小的数开始，将它的数量记录到自己的平方上，这里取巧在于每个数拿到的都是自己的子项累加的数量，不需要再进行去重和反向查找等

## 代码

```go
func longestSquareStreak(nums []int) int {
	dp := make(map[int]int)
	sort.Ints(nums)
	ans := 1
	for _, v := range nums {
		c := 0
		var ok bool
		if c, ok = dp[v]; ok {
			c += 1
		} else {
			c = 1
		}
		dp[v*v] = c
		if c > ans {
			ans = c
		}
	}

	if ans == 1 {
		return -1
	}
	return ans
}
```
