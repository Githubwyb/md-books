---
weight: 2414
title: "2414. Length of the Longest Alphabetical Continuous Substring"
---

# 题目

An alphabetical continuous string is a string consisting of consecutive letters in the alphabet. In other words, it is any substring of the string "abcdefghijklmnopqrstuvwxyz".

For example, "abc" is an alphabetical continuous string, while "acb" and "za" are not.

Given a string s consisting of lowercase letters only, return the length of the longest alphabetical continuous substring.

Example 1:
- Input: s = "abacaba"
- Output: 2
- Explanation: There are 4 distinct continuous substrings: "a", "b", "c" and "ab".
- "ab" is the longest continuous substring.

Example 2:
- Input: s = "abcde"
- Output: 5
- Explanation: "abcde" is the longest continuous substring.

Constraints:
- 1 <= s.length <= 105
- s consists of only English lowercase letters.


# 思路1 滑动窗口

## 分析

- 从第一个开始找一个段里面都是相差1的，发现一个不符合，判断是不是最大值，然后把窗口起始点移动过去
- 可以直接将长度作为窗口，当不满足条件，长度回到1重新加

## 代码实现

```go
func longestContinuousSubstring(s string) int {
	result := 0
	curLen := 0
	for i := range s {
		if curLen == 0 {
			curLen = 1
			continue
		}

		if s[i]-s[i-1] == 1 {
			curLen++
			continue
		}
		if curLen > result {
			result = curLen
		}
		curLen = 1
	}
	if curLen > result {
		result = curLen
	}
	return result
}
```
