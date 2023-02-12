---
weight: 2518
title: "2518. Number of Great Partitions"
---

# 题目

Given an unsorted integer array nums, return the smallest missing positive integer.

You must implement an algorithm that runs in O(n) time and uses constant extra space.

Example 1:

```
Input: nums = [1,2,0]
Output: 3
Explanation: The numbers in the range [1,2] are all in the array.
```

Example 2:

```
Input: nums = [3,4,-1,1]
Output: 2
Explanation: 1 is in the array but 2 is missing.
```

Example 3:

```
Input: nums = [7,8,9,11,12]
Output: 1
Explanation: The smallest positive integer 1 is missing.
```

Constraints:

- $1 <= nums.length <= 10^5$
- $-2^{31} <= nums[i] <= 2^{31} - 1$

# 思路1 排序遍历

## 分析

- 排序遍历

# 思路2 复用原数组，O(n)

## 分析

- 最小正整数，那么一定从1开始找
- 将原数组设想为从1到n的数组，数组元素只需要填空就好，哪里填空不对就代表这里是最小没出现的
- 每次交换一定有一个到指定位置，那么最多交换n次
- 防止重复交换，需要判断是否相等

## 代码

```go
func firstMissingPositive(nums []int) int {
	for i := range nums {
		// 不在范围内或相等（交换也相等或位置一样）就退出
		for nums[i] > 0 && nums[i] <= len(nums) && nums[i] != nums[nums[i]-1] {
			nums[i], nums[nums[i]-1] = nums[nums[i]-1], nums[i]
		}
	}
	for i := range nums {
		if i+1 != nums[i] {
			return i + 1
		}
	}
	return len(nums) + 1
}
```
