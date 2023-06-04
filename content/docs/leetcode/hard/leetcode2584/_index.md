---
weight: 2584
title: "2584. Split the Array to Make Coprime Products"
---

# 题目

You are given a 0-indexed integer array nums of length n.

A split at an index i where 0 <= i <= n - 2 is called valid if the product of the first i + 1 elements and the product of the remaining elements are coprime.

- For example, if nums = [2, 3, 3], then a split at the index i = 0 is valid because 2 and 9 are coprime, while a split at the index i = 1 is not valid because 6 and 3 are not coprime. A split at the index i = 2 is not valid because i == n - 1.

Return the smallest index i at which the array can be split validly or -1 if there is no such split.

Two values val1 and val2 are coprime if gcd(val1, val2) == 1 where gcd(val1, val2) is the greatest common divisor of val1 and val2.

Example 1:

```
Input: nums = [4,7,8,15,3,5]
Output: 2
Explanation: The table above shows the values of the product of the first i + 1 elements, the remaining elements, and their gcd at each index i.
The only valid split is at index 2.
```

Example 2:

```
Input: nums = [4,7,15,8,3,5]
Output: -1
Explanation: The table above shows the values of the product of the first i + 1 elements, the remaining elements, and their gcd at each index i.
There is no valid split.
```

Constraints:

- n == nums.length
- $1 <= n <= 10^4$
- $1 <= nums[i] <= 10^6$

# 思路1 合并区间

## 分析

- 找一个点，让前后互质。就是找一个点，前面的质因子和后面的质因子都不相同
- 转化一下，好像可以用区间来抽象这道题。每个质因子是一个区间，有最左边和最右边。
- 分割点就是找到一个点正好没有切到某个区间，就是说某个左端点大于其左侧的最大的右端点

## 代码

- 需要的数据只有左端点对应的最大的右端点，并不需要每个质数的区间，所以代码上来了个区间合并
- 只需要统计某个点为左端点时，右端点最大的值就好。map存每个质数对应的左端点，数组存每个左端点对应的最大的右端点

```go
func getPrimeFactor(n int, handle func(prime int)) {
	max := int(math.Sqrt(float64(n))) + 1
	for i := 2; i < max && i < n; i++ {
		if n%i == 0 {
			handle(i)
			n /= i
			i = 1
		}
	}
	if n > 1 {
		handle(n)
	}
}

func findValidSplit(nums []int) int {
	left := make(map[int]int)
	right := make([]int, len(nums)) // 左端点为i的右端点最大值
	for i, v := range nums {
		getPrimeFactor(v, func(prime int) {
			if l, ok := left[prime]; ok {
				right[l] = i
			} else {
				left[prime] = i
			}
		})
	}
	maxR := 0
	for l, r := range right {
		if l > maxR {
			return maxR
		}
		if r > maxR {
			maxR = r
		}
	}
	return -1
}
```
