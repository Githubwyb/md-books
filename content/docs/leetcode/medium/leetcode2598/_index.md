---
weight: 2598
title: "2598. Smallest Missing Non-negative Integer After Operations"
---

# 题目

You are given a 0-indexed integer array nums and an integer value.

In one operation, you can add or subtract value from any element of nums.

- For example, if nums = [1,2,3] and value = 2, you can choose to subtract value from nums[0] to make nums = [-1,2,3].

The MEX (minimum excluded) of an array is the smallest missing non-negative integer in it.

- For example, the MEX of [-1,2,3] is 0 while the MEX of [1,0,3] is 2.

Return the maximum MEX of nums after applying the mentioned operation any number of times.

Example 1:

```
Input: nums = [1,-10,7,13,6,8], value = 5
Output: 4
Explanation: One can achieve this result by applying the following operations:
- Add value to nums[1] twice to make nums = [1,0,7,13,6,8]
- Subtract value from nums[2] once to make nums = [1,0,2,13,6,8]
- Subtract value from nums[3] twice to make nums = [1,0,2,3,6,8]
The MEX of nums is 4. It can be shown that 4 is the maximum MEX we can achieve.
```

Example 2:

```
Input: nums = [1,-10,7,13,6,8], value = 7
Output: 2
Explanation: One can achieve this result by applying the following operation:
- subtract value from nums[2] once to make nums = [1,-10,0,13,6,8]
The MEX of nums is 2. It can be shown that 2 is the maximum MEX we can achieve.
```

Constraints:

- $1 <= nums.length, value <= 10^5$
- $-10^9 <= nums[i] <= 10^9$

# 思路1 同余分组

## 分析

- 为了凑非负整数，每个数都可以加减任意的value的值，那么每个数都可以表示成`x%value + n * value`
- 那么就以value为周期，如果某个周期不能达成0到`value-1`各有一个数，那么空出来的就是答案
- 所以将所有的数按照value取余来分组

## 代码

```go
func findSmallestInteger(nums []int, value int) int {
	grp := make([]int, value)
	for _, v := range nums {
		i := 0
		if v >= 0 {
			i = v % value
		} else {
			i = (value - (-v)%value) % value
		}
		grp[i]++
	}

	min, index := math.MaxInt, -1
	for i, v := range grp {
		if v < min {
			// 找到数量最小的某个位置和数量
			min = v
			index = i
		}
	}
	return index + min*value
}
```
