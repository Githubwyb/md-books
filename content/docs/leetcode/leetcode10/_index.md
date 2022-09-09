---
weight: 10
title: "* 10. Regular Expression Matching"
---

# 题目

Given an input string s and a pattern p, implement regular expression matching with support for `.` and `*` where:

- `.` Matches any single character
- `*` Matches zero or more of the preceding element.

The matching should cover the entire input string (not partial).


# 思路1

## 分析

当仅出现字符或`.`时，单个匹配即可

如果出现`x*`或`.*`时，可以不匹配或者匹配多个，这时匹配多个不好定义匹配几个，但是可以简化一下

如果出现`x*`，分成两种情况
- 匹配0个，跳过`x*`
- 匹配1个，不跳过`x*`

出现这两种情况取或运算即可

## 代码实现

```go
func matchSubStr(s string, i int, p string, j int) bool {
	if j == len(p) {
		return i == len(s)
	}
	// check is first charactor match
	firstMatch := i < len(s) && (p[j] == '.' || s[i] == p[j])
	// when match 'x*'
	if j+1 < len(p) && p[j+1] == '*' {
		// match none and skip || match one but not skip
		return matchSubStr(s, i, p, j+2) || (firstMatch && matchSubStr(s, i+1, p, j))
	}

	// other, match charactor directly
	return firstMatch && matchSubStr(s, i+1, p, j+1)
}

func isMatch(s string, p string) bool {
	return matchSubStr(s, 0, p, 0)
}
```

# 思路2

使用动态规划

## 分析

定义状态方程需要先找状态

定义 $f(i, j)$ 为s的前 $i$ 个字符和p的前 $j$ 个表达式是否匹配，那么没有`*`的情况，会有

$$
f(i, j) = \left\\{
\begin{array}{ll}
    f(i-1, j-1) & if & s[i] = p[j] \\\\
    false       & if & s[i] \ne p[j]
\end{array}
\right.
$$

如果遇到`*`的情况，同上一个思路，分为匹配0个跳过和匹配1个不跳过的情况

$$
f(i, j) = \left\\{
\begin{array}{ll}
    f(i, j-2)                         & 匹配0个跳过 \\\\
    s[i] == j[j-1] \land f(i-1, j)    & 匹配1个不跳过
\end{array}
\right.
$$

合并一下就成了状态转移方程

$$
f(i, j) = \left\\{
\begin{array}{ll}
	p[j] \ne * & \left\\{
	\begin{array}{ll}
		f(i-1, j-1) & if & s[i] = p[j] \\\\
		false       & if & s[i] \ne p[j]
	\end{array}
	\right.		\\\\
    p[j] = * & \left\\{
	\begin{array}{ll}
		f(i, j-2)                         & 匹配0个跳过 \\\\
		s[i] = p[j-1] \land f(i-1, j)    & 匹配1个不跳过
	\end{array}
	\right.
\end{array}
\right.
$$

定义一下初始状态
- $i$ 为0，$j$ 为0就是一个都没有，认为是true
- $i$ 为0，$j$ 可能为`x*`格式，判断一下
- $j$ 为0，$i$ 不为0，false

$$
f(i, j) = \left\\{
\begin{array}{ll}
	true                     & i = 0 \land j = 0 \\\\
	p[j] = * \land f(i, j-2) & i = 0 \\\\
	false                    & j = 0
\end{array}
\right.
$$

## 代码实现

用递归实现动态规划，并且由于上述 $i$ 和 $j$ 和数组索引不一样，要按照 $i-1$ 和 $j-1$ 处理

代码看起来和上面递归差不多，但是leetcode耗时要少，我也不知道为啥

```go
func getStatus(s string, i int, p string, j int) bool {
	if j < 0 {
		return i < 0
	}
	if i < 0 {
		return p[j] == '*' && getStatus(s, i, p, j-2)
	}

	if p[j] != '*' {
		return (p[j] == '.' || s[i] == p[j]) && getStatus(s, i-1, p, j-1)
	}
	return getStatus(s, i, p, j-2) || ((p[j-1] == '.' || s[i] == p[j-1]) && getStatus(s, i-1, p, j))
}

func isMatch(s string, p string) bool {
	return getStatus(s, len(s)-1, p, len(p)-1)
}
```
