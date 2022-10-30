---
weight: 2442
title: "2442. Count Number of Distinct Integers After Reverse Operations"
---

# 题目

You are given an array nums consisting of positive integers.

You have to take each integer in the array, reverse its digits, and add it to the end of the array. You should apply this operation to the original integers in nums.

Return the number of distinct integers in the final array.

Example 1:

```
Input: nums = [1,13,10,12,31]
Output: 6
Explanation: After including the reverse of each number, the resulting array is [1,13,10,12,31,1,31,1,21,13].
The reversed integers that were added to the end of the array are underlined. Note that for the integer 10, after reversing it, it becomes 01 which is just 1.
The number of distinct integers in this array is 6 (The numbers 1, 10, 12, 13, 21, and 31).
```

Example 2:

```
Input: nums = [2,2,2]
Output: 1
Explanation: After including the reverse of each number, the resulting array is [2,2,2,2,2,2].
The number of distinct integers in this array is 1 (The number 2).
```

Constraints:

- $1 <= nums.length <= 10^5$
- $1 <= nums[i] <= 10^6$

# 思路1 使用map进行去重

## 分析

- 去重直接用map，写个反转函数，不断插入map，最终返回map的大小，搞定

## 代码实现

```go
func reverse(num int) int {
	result := 0
	for ; num != 0; num /= 10 {
		result *= 10
		result += num % 10
	}
	return result
}

func countDistinctIntegers(nums []int) int {
	numMap := make(map[int]bool)
	for _, v := range nums {
		numMap[v] = true
		numMap[reverse(v)] = true
	}
	return len(numMap)
}
```
