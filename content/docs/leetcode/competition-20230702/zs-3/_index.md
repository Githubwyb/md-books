---
weight: 6911
title: "6911. Continuous Subarrays"
---

# 题目

You are given a 0-indexed integer array nums. A subarray of nums is called continuous if:

- Let i, i + 1, ..., j be the indices in the subarray. Then, for each pair of indices i <= i1, i2 <= j, 0 <= |nums[i1] - nums[i2]| <= 2.

Return the total number of continuous subarrays.

A subarray is a contiguous non-empty sequence of elements within an array.

Example 1:

```
Input: nums = [5,4,2,4]
Output: 8
Explanation:
Continuous subarray of size 1: [5], [4], [2], [4].
Continuous subarray of size 2: [5,4], [4,2], [2,4].
Continuous subarray of size 3: [4,2,4].
Thereare no subarrys of size 4.
Total continuous subarrays = 4 + 3 + 1 = 8.
It can be shown that there are no more continuous subarrays.
```

Example 2:

```
Input: nums = [1,2,3]
Output: 6
Explanation:
Continuous subarray of size 1: [1], [2], [3].
Continuous subarray of size 2: [1,2], [2,3].
Continuous subarray of size 3: [1,2,3].
Total continuous subarrays = 3 + 2 + 1 = 6.
```

Constraints:

- $1 <= nums.length <= 10^5$
- $1 <= nums[i] <= 10^9$

# 思路1 枚举左端点

## 分析

- 直接枚举左端点，找到最长的一个符合条件的子数组，然后以此点为起点的所有子数组都满足
- 然后考虑此左端点后一位，以其为左端点的当前已经满足的都满足，只需要从右端点继续找，就很像一个滑动窗口
- 每次窗口滑动完，加上窗口长度即可
- 窗口内使用一个map记录所有的数字出现的次数，窗口左端点右移时，将此数从map中移除，每轮循环重新找窗口内的最大值和最小值，窗口右端点的移动只要满足最大和最小差值小于等于2即可

## 代码

```go
func continuousSubarrays(nums []int) int64 {
	// 枚举左端点，找到不间断的子数组
	n := len(nums)
	var res int64
	intMap := make(map[int]int)
	r := 0
	for l, x := range nums {
		min, max := x, x
		for k := range intMap {
			if k < min {
				min = k
			}
			if k > max {
				max = k
			}
		}

		// 找窗口右端点，从上一个右端点向右遍历
		for ; r < n; r++ {
			v := nums[r]
			if v < min {
				min = v
			}
			if v > max {
				max = v
			}
			if max-min > 2 {
				break
			}
			intMap[v]++
		}
		res += int64(r - l)
		if intMap[x]--; intMap[x] == 0 {
			delete(intMap, x)
		}
	}
	return res
}
```
