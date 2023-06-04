---
weight: 2461
title: "2461. Maximum Sum of Distinct Subarrays With Length K"
---

# 题目

You are given an integer array nums and an integer k. Find the maximum subarray sum of all the subarrays of nums that meet the following conditions:

- The length of the subarray is k, and
- All the elements of the subarray are distinct.

Return the maximum subarray sum of all the subarrays that meet the conditions. If no subarray meets the conditions, return 0.

A subarray is a contiguous non-empty sequence of elements within an array.

Example 1:

```
Input: nums = [1,5,4,2,9,9,9], k = 3
Output: 15
Explanation: The subarrays of nums with length 3 are:
- [1,5,4] which meets the requirements and has a sum of 10.
- [5,4,2] which meets the requirements and has a sum of 11.
- [4,2,9] which meets the requirements and has a sum of 15.
- [2,9,9] which does not meet the requirements because the element 9 is repeated.
- [9,9,9] which does not meet the requirements because the element 9 is repeated.
We return 15 because it is the maximum subarray sum of all the subarrays that meet the conditions
```

Example 2:

```
Input: nums = [4,4,4], k = 3
Output: 0
Explanation: The subarrays of nums with length 3 are:
- [4,4,4] which does not meet the requirements because the element 4 is repeated.
We return 0 because no subarrays meet the conditions.
```

Constraints:

- $1 <= k <= nums.length <= 10^5$
- $1 <= nums[i] <= 10^5$

# 思路1

## 分析

- 双指针或者叫滑动窗口
- 用一个map存上一次出现的索引，就不用删除了
- 遇到有的直接左指针移到上一次出现的右边即可

## 代码

```go
func maximumSubarraySum(nums []int, k int) int64 {
	numMap := make(map[int]int) // value为最近一次出现的索引
	var res int64 = 0
	var add int64 = 0
	l := 0 // 左指针，包含
	for r, v := range nums {
		add += int64(v)
		index, ok := numMap[v]
		if ok && index >= l {
			// 找到相等的，并且就在范围内，将左侧左移到index右边
			for i := l; i <= index; i++ {
				add -= int64(nums[i])
			}
			l = index + 1
		} else if r-l == k-1 {
			if add > res {
				res = add
			}
			add -= int64(nums[l])
			l++
		}
		numMap[v] = r
	}
	return res
}
```
