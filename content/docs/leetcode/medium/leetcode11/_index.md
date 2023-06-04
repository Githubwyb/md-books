---
weight: 11
title: "11. Container With Most Water"
---

# 题目

You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.

Notice that you may not slant the container.

# 思路1

## 分析

自己想的动态规划

定义两个函数
- $f(n)$ 代表前 $n$ 个数组中最大的容量
- $g(n)$ 代表以 $n$ 结尾的最大的容量

那么有

$$
f(n+1) = max(f(n), g(n+1))
$$

然后，时间复杂度超了。。。。应该是很多计算没必要

# 思路2

## 分析

$i$ 和 $j$ 之间的容量表示为

$$
container(i, j) = (j - i) \times min(height[i], height[j])
$$

那么先要求 $j-i$ 最大，也就是两个边界

向内收缩的时候，$j-i$ 会减小，需要找到一个比小的边界更高的才行，不然无法计算出比结果更大的

那么就需要较小的边界收缩，较大的不动

## 代码实现

```go
func maxArea(height []int) (result int) {
	left, right := 0, len(height)-1

	for right > left {
		minValue := height[left]
		if minValue > height[right] {
			minValue = height[right]
		}

		tmp := (right - left) * minValue
		if tmp > result {
			result = tmp
		}

		// less border move, move to a bigger border than minValue
		if height[left] < height[right] {
			for right > left && height[left] <= minValue {
				left++
			}
		} else {
			for right > left && height[right] <= minValue {
				right--
			}
		}
	}
	return
}
```

# 思路3

官方解答

## 分析

和思路2差不多，还更差一点，但是代码量小了

通俗来讲，小的移动，虽然可能变得更差，但是总比不动（或者减小）强

## 代码实现

```go
func maxArea1(height []int) (result int) {
	left, right := 0, len(height)-1

	for right > left {
		minValue := height[left]
		if minValue > height[right] {
			minValue = height[right]
		}
		tmp := (right - left) * minValue
		if result < tmp {
			result = tmp
		}
		if height[left] < height[right] {
			left++
		} else {
			right--
		}
	}
	return
}
```
