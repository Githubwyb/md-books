---
weight: 2522
title: "2522. Partition String Into Substrings With Values at Most K"
---

# 题目

You are given a string s consisting of digits from 1 to 9 and an integer k.

A partition of a string s is called good if:

- Each digit of s is part of exactly one substring.
- The value of each substring is less than or equal to k.

Return the minimum number of substrings in a good partition of s. If no good partition of s exists, return -1.

Note that:

- The value of a string is its result when interpreted as an integer. For example, the value of "123" is 123 and the value of "1" is 1.
- A substring is a contiguous sequence of characters within a string.

Example 1:

```
Input: s = "165462", k = 60
Output: 4
Explanation: We can partition the string into substrings "16", "54", "6", and "2". Each substring has a value less than or equal to k = 60.
It can be shown that we cannot partition the string into less than 4 substrings.
```

Example 2:

```
Input: s = "238182", k = 5
Output: -1
Explanation: There is no good partition for this string.
```

Constraints:

- $1 <= s.length <= 105$
- s[i] is a digit from '1' to '9'.
- $1 <= k <= 10^9$

# 思路1 正面查找

## 分析

- 其实每一个数都尽可能大就好了，不用担心因为多找了一位而导致后面不好整
- 假设abcd四个数，如果`bcd < k`，`abc > k`，分为`ab`、`cd`与`a`、`bcd`一个效果
- 所以从第一个开始尽可能找匹配的即可
- 为-1仅有一种可能，某一位本身大于k，否则肯定有值，那么就可以提前将最后一个计算进去，count从1开始

## 代码

```go
func minimumPartition(s string, k int) int {
	t := 0
	result := 1
	for _, v := range s {
		d := int(byte(v) - '0')
		if d > k {
			return -1
		}
		tmp := t*10 + d
		if tmp > k {
			t = d
			result++
		} else {
			t = tmp
		}
	}
	return result
}
```
