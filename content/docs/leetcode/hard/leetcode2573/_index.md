---
weight: 2573
title: "2573. Count the Number of Square-Free Subsets"
---

# 题目

We define the lcp matrix of any 0-indexed string word of n lowercase English letters as an n x n grid such that:

- lcp[i][j] is equal to the length of the longest common prefix between the substrings word[i,n-1] and word[j,n-1].

Given an n x n matrix lcp, return the alphabetically smallest string word that corresponds to lcp. If there is no such string, return an empty string.

A string a is lexicographically smaller than a string b (of the same length) if in the first position where a and b differ, string a has a letter that appears earlier in the alphabet than the corresponding letter in b. For example, "aabd" is lexicographically smaller than "aaca" because the first position they differ is at the third letter, and 'b' comes before 'c'.

Example 1:

```
Input: lcp = [[4,0,2,0],[0,3,0,1],[2,0,2,0],[0,1,0,1]]
Output: "abab"
Explanation: lcp corresponds to any 4 letter string with two alternating letters. The lexicographically smallest of them is "abab".
```

Example 2:

```
Input: lcp = [[4,3,2,1],[3,3,2,1],[2,2,2,1],[1,1,1,1]]
Output: "aaaa"
Explanation: lcp corresponds to any 4 letter string with a single distinct letter. The lexicographically smallest of them is "aaaa".
```

Example 3:

```
Input: lcp = [[4,3,2,1],[3,3,2,1],[2,2,2,1],[1,1,1,3]]
Output: ""
Explanation: lcp[3][3] cannot be equal to 3 since word[3,...,3] consists of only a single letter; Thus, no answer exists.
```

Constraints:

- 1 <= n == lcp.length == lcp[i].length <= 1000
- 0 <= lcp[i][j] <= n

# 思路1

## 分析

从题目分析，lcp满足下面几个性质

- lcp[i][i] = n - i，就是从某一个下标后面的自己和自己肯定相等
- lcp左右对称
- lcp[i][j] <= n - max(i, j)

先全部设置初始值为'\0'，然后根据lcp开始构造，首先假设第一个是a，遇到和第一个相等的都是a。然后从第一个'\0'设置成b，同上

- 注意: 字符串中不能存在字符超过`z`

## 代码

- 想在一个循环中实现，就右上角用于设置字符串，因为每个字符需要先看后面有没有和它相等的
- 左下角就用于判断是否是对称矩阵

```go
func findTheString(lcp [][]int) string {
	n := len(lcp)
	s := make([]byte, n)
	var c byte = 'a'
	for i := range lcp {
		if s[i] == 0 {
			if c > 'z' {
				return ""
			}
			s[i] = c
			c++
		}
		for j := range lcp {
			if i == j {
				// 判断对角线
				if lcp[i][j] != n-i {
					return ""
				}
				continue
			}
			if j < i {
				// 左下角用于判断是否对称
				if lcp[j][i] != lcp[i][j] {
					return ""
				}
				// 右上角用于拼接字符串，所以左下角的返回
				continue
			}
			if lcp[i][j] > (n - i) {
				return ""
			}
			if lcp[i][j] > 0 {
				s[j] = s[i]
			}
		}
	}
	// 动态规划验证矩阵，倒序验证
	for i := n - 2; i >= 0; i-- {
		for j := n - 1; j > i; j-- {
			if s[i] != s[j] {
				if lcp[i][j] != 0 {
					return ""
				}
			} else if j == n-1 {
				if lcp[i][j] != 1 {
					return ""
				}
			} else {
				if lcp[i][j] != lcp[i+1][j+1]+1 {
					return ""
				}
			}
		}
	}
	return string(s)
}
```
