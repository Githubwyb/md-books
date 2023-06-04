---
weight: 2609
title: "2609. Find the Longest Balanced Substring of a Binary String"
---

# 题目

You are given a binary string s consisting only of zeroes and ones.

A substring of s is considered balanced if all zeroes are before ones and the number of zeroes is equal to the number of ones inside the substring. Notice that the empty substring is considered a balanced substring.

Return the length of the longest balanced substring of s.

A substring is a contiguous sequence of characters within a string.

Example 1:

```
Input: s = "01000111"
Output: 6
Explanation: The longest balanced substring is "000111", which has length 6.
```

Example 2:

```
Input: s = "00111"
Output: 4
Explanation: The longest balanced substring is "0011", which has length 4.
```

Example 3:

```
Input: s = "111"
Output: 0
Explanation: There is no balanced substring except the empty substring, so the answer is 0.
```

Constraints:

- 1 <= s.length <= 50
- '0' <= s[i] <= '1'

# 思路1

## 分析

- 遍历一遍，对每一组01进行统计，在1到0的时候更新最大值

## 代码

```go
func max(a, b int) int {
	if a < b {
		return b
	}
	return a
}

func min(a, b int) int {
	if a > b {
		return b
	}
	return a
}

func findTheLongestBalancedSubstring(s string) int {
	res := 0
	pre, cnt := 0, 0 // pre为0的数量，cnt为当前字符连续的数量
	n := len(s)
	for i, v := range s {
		cnt++
		if i == n-1 || byte(v) != s[i+1] {
			if v == '0' {
				// 0到1变化，pre等于cnt
				pre = cnt
			} else {
				// 1到0变化，判断是否可以更新res
				res = max(res, min(pre, cnt)*2)
			}
			// 变化重新统计
			cnt = 0
		}
	}
	return res
}
```
