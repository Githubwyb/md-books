---
weight: 2710
title: "2710. Remove Trailing Zeros From a String"
---

# 题目

Given a positive integer num represented as a string, return the integer num without trailing zeros as a string.

Example 1:

```
Input: num = "51230100"
Output: "512301"
Explanation: Integer "51230100" has 2 trailing zeros, we remove them and return integer "512301".
```

Example 2:

```
Input: num = "123"
Output: "123"
Explanation: Integer "123" has no trailing zeros, we return integer "123".
```

Constraints:

- 1 <= num.length <= 1000
- num consists of only digits.
- num doesn't have any leading zeros.

# 思路1

## 分析

- 照着做，倒着找第一个非0的位置，裁剪

## 代码

```go
func removeTrailingZeros(num string) string {
	i := len(num)-1
	for ; i >= 0 && num[i] == '0'; i-- {
	}
	return num[:i+1]
}
```
