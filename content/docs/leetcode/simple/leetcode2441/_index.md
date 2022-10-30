---
weight: 2441
title: "2441. Largest Positive Integer That Exists With Its Negative"
---

# 题目

Given an integer array nums that does not contain any zeros, find the largest positive integer k such that -k also exists in the array.

Return the positive integer k. If there is no such integer, return -1.

Example 1:

```
Input: nums = [-1,2,-3,3]
Output: 3
Explanation: 3 is the only valid k we can find in the array.
```

Example 2:

```
Input: nums = [-1,10,6,7,-7,1]
Output: 7
Explanation: Both 1 and 7 have their corresponding negative values in the array. 7 has a larger value.
```

Example 3:

```
Input: nums = [-10,8,6,7,-2,-3]
Output: -1
Explanation: There is no a single valid k, we return -1.
```

Constraints:

- $1 <= nums.length <= 1000$
- $-1000 <= nums[i] <= 1000$
- $nums[i] != 0$

# 思路1 排序+双指针

## 分析

- 排序，左右两个指针，相加等于0直接返回右指针；大于0，右指针移动；小于0，左指针移动。

## 代码

```go
func findMaxK2(nums []int) int {
	sort.Ints(nums)
	l, r := 0, len(nums)-1
	for l < r {
		addResult := nums[l] + nums[r]
		if addResult == 0 {
			return nums[r]
		} else if addResult > 0 {
			r--
		} else {
			l++
		}
	}
	return -1
}
```

# 思路2 使用map查找遍历解决

# 分析

- 使用map记录每一个数字，遍历找对应的相反数是否出现过，出现过就记录，最终返回最大的

# 代码

```go
func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

func findMaxK1(nums []int) int {
	numMap := make(map[int]bool)
	result := -1
	for _, v := range nums {
		if _, ok := numMap[-v]; ok {
			if result < abs(v) {
				result = abs(v)
			}
		}
		numMap[v] = true
	}
	return result
}
```
