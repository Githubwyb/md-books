---
weight: 5
title: "- 5. Longest Palindromic Substring"
---

# 题目

Given a string s, return the longest palindromic substring in s.

# 思路1

- 暴力破解，遍历所有子串，判断是否为回文串
- 时间复杂度 $O(n^2)$

# 思路2

- 用i表示中心点，向两边扩展判断最长的回文串
- 顺便判断一下i作为中心线前一个的情况
- 时间复杂度 $O(n^2)$

```go
func longestPalindrome(s string) (result string) {
	for i := range s {
		// think medium of palindrome as i
		left := i - 1
		right := i + 1
		for left >= 0 && right < len(s) {
			if s[left] != s[right] {
				break
			}
			left--
			right++
		}
		left++
		if right-left > len(result) {
			result = s[left:right]
		}
		// think medium of palindrome as i and i+1
		left = i
		right = i + 1
		for left >= 0 && right < len(s) {
			if s[left] != s[right] {
				break
			}
			left--
			right++
		}
		left++
		if right-left > len(result) {
			result = s[left:right]
		}
	}
	return
}
```

# 思路3

- Manache算法，可以将时间复杂度降低到 $O(n)$
- 不过稍微有点不好理解
- 就是在思路2的基础上，按照前面某个回文串（要求i在其臂长内）的中心进行对称一下，对称点已经有结果就可以少判断已经判断的地方

```go
func longestPalindrome(s string) string {
	start, end := 0, -1
	t := "#"
	for i := 0; i < len(s); i++ {
		t += string(s[i]) + "#"
	}
	t += "#"
	s = t
	arm_len := []int{}
	right, j := -1, -1
	for i := 0; i < len(s); i++ {
		var cur_arm_len int
		if right >= i {
			i_sym := j*2 - i
			min_arm_len := min(arm_len[i_sym], right-i)
			cur_arm_len = expand(s, i-min_arm_len, i+min_arm_len)
		} else {
			cur_arm_len = expand(s, i, i)
		}
		arm_len = append(arm_len, cur_arm_len)
		if i+cur_arm_len > right {
			j = i
			right = i + cur_arm_len
		}
		if cur_arm_len*2+1 > end-start {
			start = i - cur_arm_len
			end = i + cur_arm_len
		}
	}
	ans := ""
	for i := start; i <= end; i++ {
		if s[i] != '#' {
			ans += string(s[i])
		}
	}
	return ans
}

func expand(s string, left, right int) int {
	for ; left >= 0 && right < len(s) && s[left] == s[right]; left, right = left-1, right+1 {
	}
	return (right - left - 2) / 2
}

func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
```
