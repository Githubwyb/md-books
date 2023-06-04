---
weight: 2401
title: "2401. Longest Nice Subarray"
---

# 题目

You are given an array nums consisting of positive integers.

We call a subarray of nums nice if the bitwise `AND` of every pair of elements that are in different positions in the subarray is equal to 0.

Return the length of the longest nice subarray.

A subarray is a contiguous part of an array.

Note that subarrays of length 1 are always considered nice.

# 思路1

## 分析

- 自己想的，先找到每一个数字向后有几个数字和它优雅
- 然后倒着找，以每一个数字为最后一个数字，找到前面第几个数字的底线超过或等于此数字

## 代码实现

```go
func longestNiceSubarray(nums []int) int {
	// 记录每一个数字向后的优雅数量
	niceMap := make([]int, len(nums))
	for i := range nums {
		niceMap[i] = 1
		j := i + 1
		for ; j < len(nums); j++ {
			if nums[i]&nums[j] != 0 {
				break
			}
		}
		if j-i > 1 {
			niceMap[i] = j - i
		}
	}
	// 遍历niceMap查看最大相互优雅数量
	result := 1
	// 倒序遍历，在范围内就++
	for i := len(nums) - 1; i >= result; i-- {
		j := i - 1
		for ; j >= 0; j-- {
			if niceMap[j] < i-j+1 {
				break
			}
		}
		if i-j > result {
			result = i - j
		}
	}
	return result
}
```

# 思路2

## 分析

- 看网上其他人写的，还是自己想简单了，对按位操作不敏感
- 首先确定一个事实，如果一个数和另一个数按位与为0，说明在二进制上，两个数字的1都分布在不同的位置上
- 进一步推出，如果一个数组中，所有数字相互之间按位与都为0，说明他们的二进制数字中，没有任何一个1在同一个位置上
- 我们再次推出，如果一个数字和另外两个数字按位与为0，那么和他们或起来的数字按位与同样为0
- 那么找一个数字保存前面所有数字的按位与的结果，如果后一个数字和此数字按位与为0，就按位或加进来，否则，将最左边的移出去，也就是异或出去

## 代码

```go
func max(a, b int) int {
	if b > a {
		return b
	}
	return a
}

func longestNiceSubarray1(nums []int) int {
	result := 1 // 记录最终结果，最少为1
	left := 0
	mask := 0 // 记录或的值
	for right, v := range nums {
		// 排除不符合条件的
		for (v & mask) != 0 {
			mask ^= nums[left]
			left++
		}
		mask |= v
		result = max(result, right-left+1)
	}
	return result
}
```
