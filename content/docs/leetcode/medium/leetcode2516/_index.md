---
weight: 2516
title: "2516. Take K of Each Character From Left and Right"
---

# 题目

You are given a string s consisting of the characters 'a', 'b', and 'c' and a non-negative integer k. Each minute, you may take either the leftmost character of s, or the rightmost character of s.

Return the minimum number of minutes needed for you to take at least k of each character, or return -1 if it is not possible to take k of each character.

Example 1:

```
Input: s = "aabaaaacaabc", k = 2
Output: 8
Explanation:
Take three characters from the left of s. You now have two 'a' characters, and one 'b' character.
Take five characters from the right of s. You now have four 'a' characters, two 'b' characters, and two 'c' characters.
A total of 3 + 5 = 8 minutes is needed.
It can be proven that 8 is the minimum number of minutes needed.
```

Example 2:

```
Input: s = "a", k = 1
Output: -1
Explanation: It is not possible to take one 'b' or 'c' so return -1.
```
 
Constraints:

- $1 <= s.length <= 10^5$
- s consists of only the letters 'a', 'b', and 'c'.
- $0 <= k <= s.length$

# 思路1 双指针

## 分析

- 先假设左侧没有，全部取右侧，能否满足要求，不满足就返回-1
- 满足要求开始缩减，右侧对应的位置的字母统计大于k就右移，右移到不能大于为止，判断和result是不是最小
- 然后将左侧指向的字符加入，下一个循环判断
- 当左侧大于当前最小结果就不用继续了，因为一定左侧加右侧大于当前结果

## 代码

```go
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func takeCharacters(s string, k int) int {
	if k == 0 {
		return 0
	}
	chCount := make([]int, 3)
	// 第一个for循环，查看左侧为0，右侧需要有多长
	for r := len(s) - 1; r >= 0; r-- {
		chCount[int(s[r]-'a')]++
	}
	for _, v := range chCount {
		if v < k {
			return -1
		}
	}

	result := len(s)
	r := 0
	// l所在位置还没有被选入，下一个循环被选入，不用考虑最后一个，因为最后一个和r到第一个一样
	for l := 0; l < result; l++ {
		// 右侧对应的字符大于k，说明右侧可以移动
		for r < len(s) && chCount[int(s[r]-'a')] > k {
			chCount[int(s[r]-'a')]--
			r++
		}
		result = min(result, l+len(s)-r)
		chCount[int(s[l]-'a')]++
	}

	return result
}
```
