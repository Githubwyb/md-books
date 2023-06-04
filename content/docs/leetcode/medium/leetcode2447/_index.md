---
weight: 2447
title: "2447. Number of Subarrays With GCD Equal to K"
---

# 题目

Given an integer array nums and an integer k, return the number of subarrays of nums where the greatest common divisor of the subarray's elements is k.

A subarray is a contiguous non-empty sequence of elements within an array.

The greatest common divisor of an array is the largest integer that evenly divides all the array elements.

Example 1:

```
Input: nums = [9,3,1,2,6,3], k = 3
Output: 4
Explanation: The subarrays of nums where 3 is the greatest common divisor of all the subarray's elements are:
- [9,3,1,2,6,3]
- [9,3,1,2,6,3]
- [9,3,1,2,6,3]
- [9,3,1,2,6,3]
```

Example 2:

```
Input: nums = [4], k = 7
Output: 0
Explanation: There are no subarrays of nums where 7 is the greatest common divisor of all the subarray's elements.
```

Constraints:

- 1 <= nums.length <= 1000
- $1 <= nums[i], k <= 10^9$

# 思路1

## 分析

- 遍历起点，找所有的子数组
- 使用最大公约数的传递性计算

## 代码

```go
func mgcd(a int, b int) int {
	for a != 0 {
		a, b = b%a, a
	}
	return b
}

func subarrayGCD(nums []int, k int) int {
	result := 0
	for i := range nums {
		// 从起点向后最大公约数设为tmp
		// 向后遍历查看有几个子数组
		for tmp, j := nums[i], i; j < len(nums); j++ {
			if nums[j]%k != 0 {
				// 数组中存在一个不是k的倍数的值，就不用继续找了
				break
			}

			// 倍数的最大公约数向后传递，如 gcd(8, 4) = 4 => gcd(8, 4, 6) = gcd(4, 6) = 2
			if tmp != k {
				tmp = mgcd(tmp, nums[j])
			}

			if tmp == k {
				result++
			}
		}
	}
	return result
}
```
