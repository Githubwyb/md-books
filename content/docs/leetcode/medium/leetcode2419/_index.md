---
weight: 2419
title: "2419. Longest Subarray With Maximum Bitwise AND"
---

# 题目

You are given an integer array nums of size n.

Consider a `non-empty` subarray from nums that has the maximum possible `bitwise AND`.

- In other words, let k be the maximum value of the bitwise AND of any subarray of nums. Then, only subarrays with a bitwise AND equal to k should be considered.

Return the length of the longest such subarray.

The bitwise AND of an array is the bitwise AND of all the numbers in it.

A subarray is a contiguous sequence of elements within an array.

Example 1:

```
Input: nums = [1,2,3,3,2,2]
Output: 2
Explanation:
The maximum possible bitwise AND of a subarray is 3.
The longest subarray with that value is [3,3], so we return 2.
```

Example 2:

```
Input: nums = [1,2,3,4]
Output: 1
Explanation:
The maximum possible bitwise AND of a subarray is 4.
The longest subarray with that value is [4], so we return 1.
```

Constraints:

- $1 \le nums.length \le 10^5$
- $1 \le nums[i] \le 10^6$

# 思路1 找最大值连续最多出现几次

## 分析

- 按位与只会将数字变小，那么最大值只能是最大的那个数字
- 这题就是求最大的数字最多连续出现了几次

## 代码实现

```go
func longestSubarray(nums []int) int {
	max := nums[0]
	result := 1
	length := 1
	for i, v := range nums {
		if i == 0 {
			continue
		}
		if v > max {
			max = v
			length = 1
			result = 1
		} else if v == max {
			length++
			if length > result {
				result = length
			}
		} else {
			length = 0
		}
	}
	return result
}
```
