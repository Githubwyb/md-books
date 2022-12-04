---
weight: 2486
title: "2486. Append Characters to String to Make Subsequence"
---

# 题目

You are given two strings s and t consisting of only lowercase English letters.

Return the minimum number of characters that need to be appended to the end of s so that t becomes a subsequence of s.

A subsequence is a string that can be derived from another string by deleting some or no characters without changing the order of the remaining characters.

Example 1:

```
Input: s = "coaching", t = "coding"
Output: 4
Explanation: Append the characters "ding" to the end of s so that s = "coachingding".
Now, t is a subsequence of s ("coachingding").
It can be shown that appending any 3 characters to the end of s will never make t a subsequence.
```

Example 2:

```
Input: s = "abcde", t = "a"
Output: 0
Explanation: t is already a subsequence of s ("abcde").
```

Example 3:

```
Input: s = "z", t = "abcde"
Output: 5
Explanation: Append the characters "abcde" to the end of s so that s = "zabcde".
Now, t is a subsequence of s ("zabcde").
It can be shown that appending any 4 characters to the end of s will never make t a subsequence.
```

Constraints:

- $1 <= s.length, t.length <= 10^5$
- s and t consist only of lowercase English letters.

# 思路1 双指针

## 分析

- 由于需要按顺序找子序列，所以便利两个字符串，找到s中按顺序的t中有多少字母
- 排除这些剩余的就是需要追加的字符数量

## 代码

```go
func appendCharacters(s string, t string) int {
	i := 0
	for _, v := range s {
		if byte(v) == t[i] {
			i++
			if i == len(t) {
				return 0
			}
		}
	}
	return len(t) - i
}
```
