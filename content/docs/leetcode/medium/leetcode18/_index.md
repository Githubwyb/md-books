---
weight: 18
title: "18. 4Sum"
---

# 题目

Given an array nums of n integers, return an array of all the unique quadruplets [nums[a], nums[b], nums[c], nums[d]] such that:

- 0 <= a, b, c, d < n
- a, b, c, and d are distinct.
- nums[a] + nums[b] + nums[c] + nums[d] == target

You may return the answer in any order.

Example 1:

```
Input: nums = [1,0,-1,0,-2,2], target = 0
Output: [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]
```

Example 2:

```
Input: nums = [2,2,2,2,2], target = 8
Output: [[2,2,2,2]]
```

Constraints:

- 1 <= nums.length <= 200
- $-10^9 <= nums[i] <= 10^9$
- $-10^9 <= target <= 10^9$

# 思路1 暴力破解

## 分析

- 所有人的第一想法，4重循环直接做，然后去个重

# 思路2 两轮循环+双指针

## 分析

- 第一个优化，因为要去重，那直接排个序，然后保证顺序的情况下就不会有重复的数字了，循环时考虑每一个元素不要取到相同的就好了
- 第二个优化，最后两轮循环其实可以参考两个元素之和，使用双指针进行，将 $O(n^2)$ 变成 $O(n)$

## 代码

```go
func fourSum(nums []int, target int) [][]int {
	// 先排序
	sort.Ints(nums)
	result := make([][]int, 0)
	n := len(nums)
	// 然后前两个用循环套
	// 第一个元素首先不能和随后的三个相加已经大于target了，毕竟排了序，大于后面随便选都不可能等于target
	for i := 0; i < n-3 && nums[i]+nums[i+1]+nums[i+2]+nums[i+3] <= target; i++ {
		// 下一轮循环时第一个元素必须选和当前不一样的，否则就重复了
		// 并且不能和最大的三个相加还比target小，否则同样无法满足选四个相加等于target
		if nums[i]+nums[n-1]+nums[n-2]+nums[n-3] < target || (i > 0 && nums[i] == nums[i-1]) {
			continue
		}
		for j := i + 1; j < n-2 && nums[i]+nums[j]+nums[j+1]+nums[j+2] <= target; j++ {
			if nums[i]+nums[j]+nums[n-1]+nums[n-2] < target || (j > i+1 && nums[j] == nums[j-1]) {
				continue
			}
			// 剩余两个数使用双指针找
			for l, r, t := j+1, n-1, target-nums[i]-nums[j]; r > l; {
				tmp := nums[r] + nums[l] - t
				if tmp == 0 {
					result = append(result, []int{nums[i], nums[j], nums[l], nums[r]})
				}
				if tmp >= 0 {
					for r--; r > l && nums[r] == nums[r+1]; r-- {
					}
				}
				if tmp <= 0 {
					for l++; r > l && nums[l] == nums[l-1]; l++ {
					}
				}
			}
		}
	}
	return result
}
```
