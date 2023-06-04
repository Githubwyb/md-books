---
weight: 2475
title: "2475. Number of Unequal Triplets in Array"
---

# 题目

You are given a 0-indexed array of positive integers nums. Find the number of triplets (i, j, k) that meet the following conditions:

- 0 <= i < j < k < nums.length
- nums[i], nums[j], and nums[k] are pairwise distinct.
	- In other words, nums[i] != nums[j], nums[i] != nums[k], and nums[j] != nums[k].

Return the number of triplets that meet the conditions.

Example 1:

```
Input: nums = [4,4,2,4,3]
Output: 3
Explanation: The following triplets meet the conditions:
- (0, 2, 4) because 4 != 2 != 3
- (1, 2, 4) because 4 != 2 != 3
- (2, 3, 4) because 2 != 4 != 3
Since there are 3 triplets, we return 3.
Note that (2, 0, 4) is not a valid triplet because 2 > 0.
```

Example 2:

```
Input: nums = [1,1,1,1,1]
Output: 0
Explanation: No triplets meet the conditions so we return 0.
```

Constraints:

- 3 <= nums.length <= 100
- 1 <= nums[i] <= 1000

# 思路1 爆破

## 分析

- 照着做

## 代码

```go
func unequalTriplets(nums []int) int {
	result := 0
	for i := 0; i < len(nums)-2; i++ {
		for j := i + 1; j < len(nums)-1; j++ {
			if nums[j] == nums[i] {
				continue
			}
			for k := j + 1; k < len(nums); k++ {
				if nums[k] == nums[j] || nums[k] == nums[i] {
					continue
				}
				result++
			}
		}
	}
	return result
}
```

# 思路2 排序+分组

## 分析

- 只要数量，那么顺序就无所谓了，那么先排序
- 排完序之后可以认为中间的数是x，那么小于x的有a个，x有b个，大于x的有c个，x在中间的数对有abc个

## 代码

```go
func unequalTriplets1(nums []int) int {
	sort.Ints(nums)
	n := len(nums)
	// x作为中间的数，那么小于x的有a个，x有b个，大于x的有c个，x在中间的数对有abc个
	start, res := 0, 0 // start为x的起始位置
	for i, x := range nums[:n-1] {
		if x != nums[i+1] {
			res += start * (i + 1 - start) * (n - i - 1)
			start = i + 1
		}
	}
	return res
}
```

# 思路3 分组+计算

## 分析

- 思路和上面一样，不过排完序再算abc不太优雅，用分组来直接统计数量更好
- 使用hashmap来统计

## 代码

```go
func unequalTriplets2(nums []int) int {
	h := make(map[int]int)
	for _, v := range nums {
		h[v]++
	}
	a, c, res := 0, len(nums), 0
	for _, b := range h {
		c -= b
		res += a * b * c
		a += b
	}
	return res
}
```
