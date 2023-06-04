---
weight: 658
title: "658. Find K Closest Elements"
---

# 题目

Given a sorted integer array arr, two integers k and x, return the k closest integers to x in the array. The result should also be sorted in ascending order.

An integer a is closer to x than an integer b if:

- `|a - x| < |b - x|`, or
- `|a - x| == |b - x|` and `a < b`


# 思路1

## 分析

- 双指针法，找到最接近x的数字，然后直接两边开始遍历

## 代码实现

```go
func findClosestElements2(arr []int, k int, x int) []int {
	right := sort.SearchInts(arr, x)
	left := right - 1
	if left < 0 {
		return arr[:k]
	}
	for right-left < k+1 {
		if left < 0 {
			right++
		} else if right >= len(arr) || arr[left]+arr[right] >= x+x {
			left--
		} else {
			right++
		}
	}
	return arr[left+1 : right]
}
```

# 思路2

## 分析

- 写一个自定义cmp，直接排序取前k个

## 代码实现

```go
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func findClosestElements1(arr []int, k int, x int) []int {
	sort.SliceStable(arr, func(i, j int) bool { return abs(arr[i]-x) < abs(arr[j]-x) })
	arr = arr[:k]
	sort.Ints(arr)
	return arr
}
```
