---
weight: 2457
title: "2457. Minimum Addition to Make Integer Beautiful"
---

# 题目

You are given two positive integers n and target.

An integer is considered beautiful if the sum of its digits is less than or equal to target.

Return the minimum non-negative integer x such that n + x is beautiful. The input will be generated such that it is always possible to make n beautiful.

Example 1:

```
Input: n = 16, target = 6
Output: 4
Explanation: Initially n is 16 and its digit sum is 1 + 6 = 7. After adding 4, n becomes 20 and digit sum becomes 2 + 0 = 2. It can be shown that we can not make n beautiful with adding non-negative integer less than 4.
```

Example 2:

```
Input: n = 467, target = 6
Output: 33
Explanation: Initially n is 467 and its digit sum is 4 + 6 + 7 = 17. After adding 33, n becomes 500 and digit sum becomes 5 + 0 + 0 = 5. It can be shown that we can not make n beautiful with adding non-negative integer less than 33.
```

Example 3:

```
Input: n = 1, target = 1
Output: 0
Explanation: Initially n is 1 and its digit sum is 1, which is already smaller than or equal to target.
```

Constraints:

- $1 <= n <= 10^{12}$
- 1 <= target <= 150
- The input will be generated such that it is always possible to make n beautiful.

# 思路1 拆分计算

## 分析

- 先将数拆分为一个一个数字，计算目标值和当前值差多少
- 然后一位一位进，进到差值一样即可

## 代码

```go
func makeIntegerBeautiful(n int64, target int) int64 {
	curSum := 0
	nums := make([]int, 0, 12)
	for n != 0 {
		t := int(n % 10)
		curSum += t
		nums = append(nums, t)
		n = n / 10
	}

	if curSum <= target {
		return 0
	}

	var result int64 = 0
	aa := 1
	for _, v := range nums {
		// 先假设每一位都加到9，最终返回结果要加一
		result += int64(9-v) * int64(aa)
		curSum -= v
		// 排除一位，但是高位要进一，所以判断小于即可
		if curSum < target {
			return result + 1
		}
		aa *= 10
	}
	return result + 1
}
```
