---
weight: 2443
title: "2443. Sum of Number and Its Reverse"
---

# 题目

Given a non-negative integer num, return true if num can be expressed as the sum of any non-negative integer and its reverse, or false otherwise.

Example 1:

```
Input: num = 443
Output: true
Explanation: 172 + 271 = 443 so we return true.
```

Example 2:

```
Input: num = 63
Output: false
Explanation: 63 cannot be expressed as the sum of a non-negative integer and its reverse so we return false.
```

Example 3:

```
Input: num = 181
Output: true
Explanation: 140 + 041 = 181 so we return true. Note that when a number is reversed, there may be leading zeros.
```

Constraints:

- $0 <= num <= 10^5$

# 思路1 暴力破解遍历

## 分析

- 暴力，但是带一点分析。如果大于n/2的数，翻转小于自己的，都遍历过了，除非是末尾是0
- 所以对于大于n/2的只用判断是不是整十就好了

## 代码实现

```go
func reverse(num int) int {
	result := 0
	for ; num != 0; num /= 10 {
		result *= 10
		result += num % 10
	}
	return result
}

func sumOfNumberAndReverse(num int) bool {
	for i := 0; i <= num; i++ {
		if i > num/2 && i%10 != 0 {
			continue
		}
		if i+reverse(i) == num {
			return true
		}
	}
	return false
}
```

# 思路2 双指针

## 分析

- 一个数加上它的取反，假设没有进位，可以得到一个中心对称的数字。就算进行进位，也最多进位一位
- 那么我们就从左右两个点开始向内收缩，查看是否可以找到一个数加上翻转自身得到
- 分两种情况
  - 进位，那么低位和高位之间相差1
  - 没进位，地位和高位一样
- 考虑最高位的情况，如果是1，可能是进位的，也可能是本身加出来的，这两种情况分别计算一下取或即可

## 代码

```go

```
