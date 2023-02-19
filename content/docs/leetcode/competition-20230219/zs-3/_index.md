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

# 思路1 状态压缩+动态规划

## 分析

- 题目条件，最大值为30，想要乘积没有平方，那么乘积一定是不同的质数的乘积
- 30以内的质数有`2, 3, 5, 7, 11, 13, 17, 19, 23, 29`这10个，转bit也就10位
- 因为乘积一定是这几个质数的乘积，那么乘积一共就只有 $2^{10} = 1024$ 种可能
- 对于每个数来说，要么无法组成子数组，要么就是子数组乘积一定在这1024种可能中
- 按照位运算，乘某个数转化为将某几个质数加入乘积，也就是对应的位置1
- 得到状态转移方程`f(x) += f(x ^ v)`，也就是某个乘积x的组合个数为这个数加入之前的所有组合个数加上这个数加入后乘积为x的所有组合个数
    - `x ^ v`代表除了v之外，想要凑成x需要乘积是多少（哪几个质因数的组合）
    - 当v和x相等时，`x ^ v`为0，也就是1，所有数都可以当成1乘以这个数，所以初值`f(0) = 1`，但是这个1是多算的，最后要减去
- 遍历所有的乘积，一个数一个数加入，最终所有的结果合并起来即可

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
	f[0] = 1
	for _, v := range nums {
		target := getTarget(v, p)
		if target == -1 {
			continue
		}
		// 找整个空间中谁可以乘以v，可以乘的就加上除v之后的数量
		for i := 0; i < n; i++ {
			// i可以由某个数乘以target得到才能参与运算
			if i&target == target {
				f[i] = (f[i] + f[i^target]) % mod
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
