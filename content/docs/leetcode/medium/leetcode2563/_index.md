---
weight: 2563
title: "2563. Count the Number of Fair Pairs"
---

# 题目

Given a 0-indexed integer array nums of size n and two integers lower and upper, return the number of fair pairs.

A pair (i, j) is fair if:

- 0 <= i < j < n, and
- lower <= nums[i] + nums[j] <= upper 

Example 1:

```
Input: nums = [0,1,7,4,4,5], lower = 3, upper = 6
Output: 6
Explanation: There are 6 fair pairs: (0,3), (0,4), (0,5), (1,3), (1,4), and (1,5).
Example 2:

Input: nums = [1,7,9,2,5], lower = 11, upper = 11
Output: 1
Explanation: There is a single fair pair: (2,3).
```

Constraints:

- $1 <= nums.length <= 10^5$
- $nums.length == n$
- $-10^9 <= nums[i] <= 10^9$
- $-10^9 <= lower <= upper <= 10^9$

# 思路1 二分

## 分析

- 排序后才能二分
- 右端点区间左侧是查找第一个大于等于lower，随着左端点增大，区间左侧减小，二分查找`[i+1, l)`
- 右端点区间右侧查找第一个大于upper的，同上要减小，二分查找`[l, r)`

## 代码

```go
func countFairPairs(nums []int, lower int, upper int) int64 {
	sort.Ints(nums)
	l, r := len(nums), len(nums)	// l代表大于i的第一个下界，r代表大于l的第一个上界
	var result int64 = 0
	//
	for i := 0; i < len(nums) && r > i+1; i++ {
		// i增加后，l应该减小，那么就要查找 [i+1, l) 区间范围
		l = sort.Search(l-i-1, func(index int) bool {
			index += i + 1
			return nums[index]+nums[i] >= lower
		}) + i + 1
		// i增加后，r也应该减小，查找范围为，[l, r)
		r = sort.Search(r-l, func(index int) bool {
			index += l
			return nums[index]+nums[i] > upper
		}) + l
		result += int64(r - l)
	}
	return result
}
```
