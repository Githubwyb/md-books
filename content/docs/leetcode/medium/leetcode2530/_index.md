---
weight: 2530
title: "2530. Maximum Count of Positive Integer and Negative Integer"
---

# 题目

You are given a 0-indexed integer array nums and an integer k. You have a starting score of 0.

In one operation:

1. choose an index i such that 0 <= i < nums.length,
2. increase your score by nums[i], and
3. replace nums[i] with ceil(nums[i] / 3).

Return the maximum possible score you can attain after applying exactly k operations.

The ceiling function ceil(val) is the least integer greater than or equal to val.

Example 1:

```
Input: nums = [10,10,10,10,10], k = 5
Output: 50
Explanation: Apply the operation to each array element exactly once. The final score is 10 + 10 + 10 + 10 + 10 = 50.
```

Example 2:

```
Input: nums = [1,10,3,3,3], k = 3
Output: 17
Explanation: You can do the following operations:
Operation 1: Select i = 1, so nums becomes [1,4,3,3,3]. Your score increases by 10.
Operation 2: Select i = 1, so nums becomes [1,2,3,3,3]. Your score increases by 4.
Operation 3: Select i = 2, so nums becomes [1,1,1,3,3]. Your score increases by 3.
The final score is 10 + 4 + 3 = 17.
```

Constraints:

- $1 <= nums.length, k <= 10^5$
- $1 <= nums[i] <= 10^9$

# 思路1 大根堆

## 分析

- 每次取最大的相加，那么就是大根堆嘛

## 代码

```go
type BigHeap []int

func (h *BigHeap) Len() int { return len(*h) }

// less必须满足当Less(i, j)和Less(j, i)都为false，则两个索引对应的元素相等
// 为true，i向栈顶移动；为false，j向栈顶移动
func (h *BigHeap) Less(i, j int) bool { return (*h)[i] > (*h)[j] }
func (h *BigHeap) Swap(i, j int)      { (*h)[i], (*h)[j] = (*h)[j], (*h)[i] }
func (h *BigHeap) Push(x interface{}) {
	*h = append(*h, x.(int))
}

func (h *BigHeap) Pop() interface{} {
	x := (*h)[len(*h)-1]
	*h = (*h)[:len(*h)-1]
	return x
}

func maxKelements(nums []int, k int) int64 {
	var bigHeap BigHeap = nums
	heap.Init(&bigHeap)
	var result int64 = 0
	for i := 0; i < k; i++ {
		v := heap.Pop(&bigHeap).(int)
		result += int64(v)
		heap.Push(&bigHeap, (v+2)/3)
	}
	return result
}
```
