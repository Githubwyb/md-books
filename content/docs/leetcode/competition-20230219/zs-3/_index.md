---
weight: 6364
title: "6364. Count the Number of Square-Free Subsets"
---

# 题目

You are given a positive integer 0-indexed array nums.

A subset of the array nums is square-free if the product of its elements is a square-free integer.

A square-free integer is an integer that is divisible by no square number other than 1.

Return the number of square-free non-empty subsets of the array nums. Since the answer may be too large, return it modulo 109 + 7.

A non-empty subset of nums is an array that can be obtained by deleting some (possibly none but not all) elements from nums. Two subsets are different if and only if the chosen indices to delete are different.

Example 1:

```
Input: nums = [3,4,4,5]
Output: 3
Explanation: There are 3 square-free subsets in this example:
- The subset consisting of the 0th element [3]. The product of its elements is 3, which is a square-free integer.
- The subset consisting of the 3rd element [5]. The product of its elements is 5, which is a square-free integer.
- The subset consisting of 0th and 3rd elements [3,5]. The product of its elements is 15, which is a square-free integer.
It can be proven that there are no more than 3 square-free subsets in the given array.
```

Example 2:

```
Input: nums = [1]
Output: 1
Explanation: There is 1 square-free subset in this example:
- The subset consisting of the 0th element [1]. The product of its elements is 1, which is a square-free integer.
It can be proven that there is no more than 1 square-free subset in the given array.
```

Constraints:

- 1 <= nums.length <= 1000
- 1 <= nums[i] <= 30

# 思路1 01背包

## 分析

- 集合乘积没有平方代表分解质因数没有重复的，每个数都不大于30，说明质因数都不会超过30
- 30以内的质数有`2, 3, 5, 7, 11, 13, 17, 19, 23, 29`这10个，转bit也就10位
- 每个集合就可以用一个10位的数表示，0代表没有或者只有1
- 用01背包去解，考虑集合为一个背包，那么背包中物品价值最大为全部质数都在里面，也就是1024
- 那么每一个数都可以装或不装背包，可以用一个map去存，key为背包的价值，value为达到这个价值的方案数
- 那么每一个数如果可以装背包，那么装进去的价值对应的方案数为 $f(i|target) += f(i)$ ，即不带这个数之前已有的方案数加上这个数装进去后可以达成的方案数
- 初始空背包需要计算，但是最终不能用空背包就需要减去

## 代码

```go
// 将x根据p转成对应的二进制bit数
func getTarget(x int, p []int) int {
	result := 0
	for i, t := 0, 1; i < len(p) && x >= p[i]; {
		if x%p[i] != 0 {
			i, t = i+1, t<<1
			continue
		}
		if result&t != 0 {
			return -1
		}
		result |= t
		x /= p[i]
	}
	return result
}

func squareFreeSubsets(nums []int) int {
	p := []int{2, 3, 5, 7, 11, 13, 17, 19, 23, 29}
	var mod int = 1e9 + 7
	// 构建背包
	f := make(map[int]int)
	f[0] = 1 // 空背包代表一种方案，所有元素要放到空背包中
	for _, v := range nums {
		target := getTarget(v, p)
		if target == -1 {
			continue
		}
		// 这个元素可以放到背包，找现在所有的方案中可以放进去的
		for i, v := range f {
			if i&target == 0 {
				v1 := i | target
				f[v1] = (f[v1] + v) % mod
			}
		}
	}
	ans := 0
	for _, v := range f {
		ans = (ans + v) % mod
	}
	// 最终返回的不包含空背包方案
	return ans - 1
}
```

# 思路2 01背包优化时间

## 分析

- 使用map存有一个问题，就是可能会不断扩容
- 反正背包状态数最大也就1024，那么直接搞1024的数组，不需要的设置成0
- 遍历虽然多了，但是没有空间申请
- 然后发现时间是原来的 $\frac{1}{10}$，空间也少了一半，不知道怎么算的

## 代码

```go
// 将x根据p转成对应的二进制bit数
func getTarget(x int, p []int) int {
	result := 0
	for i, t := 0, 1; i < len(p) && x >= p[i]; {
		if x%p[i] != 0 {
			i, t = i+1, t<<1
			continue
		}
		if result&t != 0 {
			return -1
		}
		result |= t
		x /= p[i]
	}
	return result
}

func squareFreeSubsets(nums []int) int {
	p := []int{2, 3, 5, 7, 11, 13, 17, 19, 23, 29}
	var mod int = 1e9 + 7
	n := 1 << len(p)
	f := make([]int, n)
	f[0] = 1 // 空背包代表一种方案，所有元素要放到空背包中
	for _, v := range nums {
		target := getTarget(v, p)
		if target == -1 {
			continue
		}
		// 这个元素可以放到背包，找现在所有的方案中可以放进去的
		for i, v := range f {
			if v != 0 && i&target == 0 {
				v1 := i | target
				f[v1] = (f[v1] + v) % mod
			}
		}
	}
	ans := 0
	for _, v := range f {
		ans = (ans + v) % mod
	}
	return ans - 1
}
```

