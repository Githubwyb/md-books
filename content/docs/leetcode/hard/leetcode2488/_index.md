---
weight: 2488
title: "2488. Count Subarrays With Median K"
---

# 题目

You are given an array nums of size n consisting of distinct integers from 1 to n and a positive integer k.

Return the number of non-empty subarrays in nums that have a median equal to k.

Note:

- The median of an array is the middle element after sorting the array in ascending order. If the array is of even length, the median is the left middle element.
	- For example, the median of [2,3,1,4] is 2, and the median of [8,4,3,5,1] is 4.
- A subarray is a contiguous part of an array.

Example 1:

```
Input: nums = [3,2,1,4,5], k = 4
Output: 3
Explanation: The subarrays that have a median equal to 4 are: [4], [4,5] and [1,4,5].
```

Example 2:

```
Input: nums = [2,3,1], k = 3
Output: 1
Explanation: [3] is the only subarray that has a median equal to 3.
```

Constraints:

- n == nums.length
- $1 <= n <= 10^5$
- 1 <= nums[i], k <= n
- The integers in nums are distinct.

# 思路1 统计一边大于或小于等于，然后计算另一边

## 分析

- 此题目中的中位数可以推出来
- 奇数长度下

$$左侧小于+右侧小于 = 左侧大于+右侧大于$$
$$左侧小于-左侧大于 = 右侧大于-右侧小于$$

- 偶数长度下

$$左侧小于-左侧大于+1 = 右侧大于-右侧小于$$

- 从中位数开始，向左就是大于为-1，小于为1，累加之后如果左侧和右侧相等就找到一个子数组
- 那么步骤就是先统计左边，然后去右边找有没有匹配的
- 边界情况，中位数既要算到左边也要算到右边，可以认为是以中位数为边界，向右找要算上，中位数本身也要统计向左边有几个0或-1

## 代码

```go
func countSubarrays1(nums []int, k int) int {
	// 1. 先找中位数的位置
	v := 0
	for i := range nums {
		if nums[i] == k {
			v = i
			break
		}
	}

	// 2. 向左开始进行累加，使用map进行存储
	recordMap := make(map[int]int)
	recordMap[0] = 1 // 中位数的位置本身就是0
	tmp := 0
	for i := v - 1; i >= 0; i-- {
		if nums[i] > k {
			tmp--
		} else {
			tmp++
		}
		if _, ok := recordMap[tmp]; !ok {
			recordMap[tmp] = 0
		}
		recordMap[tmp]++
	}

	// 向右开始查找
	result := 0
	tmp = 0
	for i := v; i < len(nums); i++ {
		if nums[i] > k {
			tmp++
		} else if nums[i] < k {
			tmp--
		}
		// 左侧小于-左侧大于 = 右侧大于-右侧小于
		if count, ok := recordMap[tmp]; ok {
			result += count
		}
		// 左侧小于-左侧大于+1 = 右侧大于-右侧小于
		if count, ok := recordMap[tmp-1]; ok {
			result += count
		}
	}
	return result
}
```

# 思路2 简化成一次遍历

## 分析

- 还是上面的思路，最左侧其实等于 $\sum 左侧小于 - \sum 左侧大于$
- 整体统计数据加上 $\sum 左侧大于 - \sum 左侧小于$，那么最左边的就是0，第二个就是大于加一，小于减一，和右边计算是一致的
- 只需要考虑边界情况，将中位数计算到两边即可，那么一次遍历就解决了问题
- 第一位是按照0开始计算的，所以每个i都是在算i+1的结果，所以左边的遍历只需要到k所在位置前一个就好

## 代码

```go
func countSubarrays(nums []int, k int) int {
	result := 0
	v := len(nums)
	tmp := 0
	recordMap := make(map[int]int)
	recordMap[0] = 1 // 第一位是0
	for i := range nums {
		if nums[i] > k {
			tmp++
		} else if nums[i] < k {
			tmp--
		} else {
			v = i
		}
		// 每个i计算的都是下一位的值，所以不需要到中位数所在的位置
		if i < v {
			if _, ok := recordMap[tmp]; !ok {
				recordMap[tmp] = 0
			}
			recordMap[tmp]++
		} else {
			if count, ok := recordMap[tmp]; ok {
				result += count
			}
			if count, ok := recordMap[tmp-1]; ok {
				result += count
			}
		}
	}
	return result
}
```
