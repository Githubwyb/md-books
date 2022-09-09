---
weight: 1
title: "1. Two Sum"
---

# 题目

Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

# 思路1

- 暴力遍历，每个数字都向后找自己的另一半

# 思路2

- 每个数字向前找自己的另一半，比上一种遍历少一点

# 思路3

- 在思路2的基础上，找另一半的算法加上优化，使用hashmap进行查找

```go
func TwoSum(nums []int, target int) []int {
	hashMap := make(map[int]int)
	for i, v := range nums {
		expect := target - v
		index1, ok := hashMap[expect]
		if ok {
			return []int{index1, i}
		}
		hashMap[v] = i
	}
	return nil
}
```



