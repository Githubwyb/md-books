---
weight: 2537
title: "2537. Count the Number of Good Subarrays"
---

# 题目

Given an integer array nums and an integer k, return the number of good subarrays of nums.

A subarray arr is good if it there are at least k pairs of indices (i, j) such that i < j and arr[i] == arr[j].

A subarray is a contiguous non-empty sequence of elements within an array.

Example 1:

```
Input: nums = [1,1,1,1,1], k = 10
Output: 1
Explanation: The only good subarray is the array nums itself.
```

Example 2:

```
Input: nums = [3,1,4,3,2,2,4], k = 2
Output: 4
Explanation: There are 4 different good subarrays:
- [3,1,4,3,2,2] that has 2 pairs.
- [3,1,4,3,2,2,4] that has 3 pairs.
- [1,4,3,2,2,4] that has 2 pairs.
- [4,3,2,2,4] that has 2 pairs.
``` 

Constraints:

- $1 <= nums.length <= 10^5$
- $1 <= nums[i], k <= 10^9$

# 思路1 双指针滑动窗口

## 分析

- 找子数组，而且是大于等于k都满足，直接使用滑动窗口解题
- 如果确定左端点，不太好写。确定右端点来写滑动窗口
- 右端点右移，右端点的字母在窗口中存在几个，那么就增加几个对
- 左端点右移，左端点字母在除了左端点有几个，就减少几个对
- 当满足大于等于k时，以右端点为终点的子数组有左端点左边所有的点

## 代码

```go
func countGood(nums []int, k int) int64 {
	l := 0
	countMap := make(map[int]int)
	check := 0
	var result int64
	// 右侧遍历端点
	for _, v := range nums {
		check += countMap[v]
		countMap[v]++
		for check-countMap[nums[l]]+1 >= k {
			countMap[nums[l]]--
			check -= countMap[nums[l]]
			l++
		}
		if check >= k {
			result += int64(l + 1)
		}
	}
	return result
}
```
