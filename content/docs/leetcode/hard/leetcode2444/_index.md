---
weight: 2444
title: "2444. Count Subarrays With Fixed Bounds"
---

# 题目

You are given an integer array nums and two integers minK and maxK.

A fixed-bound subarray of nums is a subarray that satisfies the following conditions:

- The minimum value in the subarray is equal to minK.
- The maximum value in the subarray is equal to maxK.

Return the number of fixed-bound subarrays.

A subarray is a contiguous part of an array.

Example 1:

```
Input: nums = [1,3,5,2,7,5], minK = 1, maxK = 5
Output: 2
Explanation: The fixed-bound subarrays are [1,3,5] and [1,3,5,2].
```

Example 2:

```
Input: nums = [1,1,1,1], minK = 1, maxK = 1
Output: 10
Explanation: Every subarray of nums is a fixed-bound subarray. There are 10 possible subarrays.
```


Constraints:

- $2 <= nums.length <= 10^5$
- $1 <= nums[i], minK, maxK <= 10^6$

# 思路1 分析性质一次遍历

## 分析

- 定界子数组里面只有minK和maxK之间的数，并且要求包含minK和maxK
- 可以找一个起点和终点，如果中间包含minK和maxK就代表一个满足条件的子数组，起点到第一个minK或maxK之间的每个点都可以和终点组成一个子数组
- 如果出现一个大于maxK或小于minK的，就将起点设置成下一个
- minK和maxK所在索引都大于起点，就可以计算子数组数量

## 代码实现

```go
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func countSubarrays(nums []int, minK int, maxK int) int64 {
	s, minI, maxI := -1, -1, -1
	var result int64 = 0
	for e, v := range nums {
		if v < minK || v > maxK {
			s = e // 子数组不包含s
			continue
		}
		if v == minK {
			minI = e
		}
		if v == maxK {
			maxI = e
		}
		// 1 2 3 4 5
		// s   i   e
		// minI或maxI有一个小于s就不用计算，也就是+0
		// 都大于s，就是起点到较小的那个之间的数量都满足要求
		result += int64(max(min(minI, maxI)-s, 0))
	}
	return result
}
```
