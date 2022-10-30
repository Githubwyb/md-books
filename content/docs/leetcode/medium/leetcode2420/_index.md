---
weight: 2420
title: "2420. Find All Good Indices"
---

# 题目

You are given a 0-indexed integer array nums of size n and a positive integer k.

We call an index i in the range `k <= i < n - k` good if the following conditions are satisfied:

- The k elements that are just before the index i are in non-increasing order.
- The k elements that are just after the index i are in non-decreasing order.

Return an array of all good indices sorted in increasing order.

Example 1:

```
Input: nums = [2,1,1,1,3,4,1], k = 2
Output: [2,3]
Explanation: There are two good indices in the array:
- Index 2. The subarray [2,1] is in non-increasing order, and the subarray [1,3] is in non-decreasing order.
- Index 3. The subarray [1,1] is in non-increasing order, and the subarray [3,4] is in non-decreasing order.
Note that the index 4 is not good because [4,1] is not non-decreasing.
```

Example 2:

```
Input: nums = [2,1,1,2], k = 2
Output: []
Explanation: There are no good indices in this array.
```

Constraints:

- $n == nums.length$
- $3 <= n <= 10^5$
- $1 <= nums[i] <= 10^6$
- $1 <= k <= n / 2$

# 思路1 右边确认了就不用确认了

## 分析

- 为了减少时间复杂度，右边确认了n个非递增后，那么判断下一个时就可以认定已经存在`n-1`个非递增数

## 代码实现

```go
func goodIndices(nums []int, k int) []int {
	leftK := k - 1
	rn := 1 // 代表index右侧多少个确认了非递减
	result := []int{}
	for index := range nums {
		if index == 0 {
			continue
		}
		// 下一个循环，上次遍历过的非递增数量-1
		if rn > 1 {
			rn--
		}
		if leftK > 0 {
			// 先找k个非递增元素
			if nums[index] <= nums[index-1] {
				leftK--
			} else {
				// 否则，左指针移到当前
				leftK = k - 1
			}
			continue
		}
		// 剩余的不到k
		if len(nums)-index-1 < k {
			break
		}
		// 查看右侧k个元素是否非递减
		i := rn
		for ; i < k; i++ {
			if nums[index+i+1] < nums[index+i] {
				break
			}
			rn++
		}
		if i == k {
			result = append(result, index)
		}
		if nums[index] > nums[index-1] {
			leftK = k - 1
		}
	}
	return result
}
```

# 思路2 动态规划

## 分析

- 官方解法就是厉害，一直想如何一遍遍历出结果，但是发现最终写出来的还是遍历了很多遍
- 其实思路差不多，我先算出来每一个元素的左侧多少非递增，如果和前一个比为非递增，则为前一个的结果加一，否则就是1
- 同理，计算每一个元素右侧多少非递减，如果和右边比非递减，则为右侧结果加一，否则就是一
- 最终遍历一遍找到左右分别满足要求的输出即可
- 动态规划在哪里，就是计算left和right时，使用前一个的结果来计算当前结果就是动态规划

## 代码

```go
func goodIndices1(nums []int, k int) []int {
	n := len(nums)
	left := make([]int, n)  // left[i]表示包括i在内，左侧多少满足非递增
	right := make([]int, n) // right[i]表示包括i在内，右侧多少满足非递减
	for i := range nums {
		left[i] = 1
		right[i] = 1
	}

	// 计算left和right
	for i := range nums {
		if i == 0 {
			continue
		}
		if nums[i] <= nums[i-1] {
			left[i] = left[i-1] + 1
		}
		if nums[n-i-1] <= nums[n-i] {
			right[n-i-1] = right[n-i] + 1
		}
	}

	// 如果某个元素左侧非递增大于等于k且右侧非递减大于等于k，则满足要求
	result := []int{}
	for i := k; i < n-k; i++ {
		if left[i-1] >= k && right[i+1] >= k {
			result = append(result, i)
		}
	}
	return result
}
```

# 思路3 动态规划优化版

## 分析

- 在上述代码基础上，倒序遍历无法省略，但是正序和本身的判断可以一起做，所以可以先计算倒序的结果，然后再正序进行边计算边判断

## 代码

```go
func goodIndices2(nums []int, k int) []int {
	n := len(nums)
	right := make([]int, n) // right[i]表示包括i在内，右侧多少满足非递减

	// 计算right
	for i := range nums {
		if i != 0 && nums[n-i-1] <= nums[n-i] {
			right[n-i-1] = right[n-i] + 1
			continue
		}
		right[n-i-1] = 1
	}

	// 如果某个元素左侧非递增大于等于k且右侧非递减大于等于k，则满足要求
	result := []int{}
	left := 1
	for i := 1; i < n-k; i++ {
		if left >= k && right[i+1] >= k {
			result = append(result, i)
		}
		if nums[i] <= nums[i-1] {
			left++
		} else {
			left = 1
		}
	}
	return result
}
```
