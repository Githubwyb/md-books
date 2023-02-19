---
weight: 2564
title: "2564. Substring XOR Queries"
---

# 题目

You are given a binary string s, and a 2D integer array queries where queries[i] = [firsti, secondi].

For the ith query, find the shortest substring of s whose decimal value, val, yields secondi when bitwise XORed with firsti. In other words, val ^ firsti == secondi.

The answer to the ith query is the endpoints (0-indexed) of the substring [lefti, righti] or [-1, -1] if no such substring exists. If there are multiple answers, choose the one with the minimum lefti.

Return an array ans where ans[i] = [lefti, righti] is the answer to the ith query.

A substring is a contiguous non-empty sequence of characters within a string.

Example 1:

```
Input: s = "101101", queries = [[0,5],[1,2]]
Output: [[0,2],[2,3]]
Explanation: For the first query the substring in range [0,2] is "101" which has a decimal value of 5, and 5 ^ 0 = 5, hence the answer to the first query is [0,2]. In the second query, the substring in range [2,3] is "11", and has a decimal value of 3, and 3 ^ 1 = 2. So, [2,3] is returned for the second query.
```

Example 2:

```
Input: s = "0101", queries = [[12,8]]
Output: [[-1,-1]]
Explanation: In this example there is no substring that answers the query, hence [-1,-1] is returned.
```

Example 3:

```
Input: s = "1", queries = [[4,5]]
Output: [[0,0]]
Explanation: For this example, the substring in range [0,0] has a decimal value of 1, and 1 ^ 4 = 5. So, the answer is [0,0].
````

Constraints:

- $1 <= s.length <= 10^4$
- s[i] is either '0' or '1'.
- $1 <= queries.length <= 10^5$
- $0 <= firsti, secondi <= 10^9$

# 思路1 字符串查找

## 分析

- 按位异或两次就得到原始数字，那么就是找原始数字在字符串的索引

## 代码

```go
func substringXorQueries(s string, queries [][]int) [][]int {
	result := make([][]int, len(queries))
	for i, v := range queries {
		findStr := fmt.Sprintf("%b", v[1]^v[0])
		l := strings.Index(s, findStr)
		if l == -1 {
			result[i] = []int{l, l}
		} else {
			result[i] = []int{l, l + len(findStr) - 1}
		}
	}
	return result
}
```

# 思路2 枚举后O(1)查找

## 分析

- 字符串查找还是很费时间的，提前枚举一下然后直接查找看是否时间更短
- 数字最大也就是 $10^9 \lt 2^{30}$ ，那么只需要枚举30位即可
- 枚举可能第一位是0，那么用长度作为判断，如果长度更短就代表去0了
- 果然时间缩短到 $\frac{1}{4}$

## 代码

```go
func substringXorQueries1(s string, queries [][]int) [][]int {
	type pair struct{ l, r int }
	checkMap := make(map[int]pair)
	for l := range s {
		for r, x := l, 0; r < l+30 && r < len(s); r++ {
			x = (x << 1) | int(s[r]&1)
			if p, ok := checkMap[x]; !ok || r-l < p.r-p.l {
				checkMap[x] = pair{l, r}
			}
		}
	}
	result := make([][]int, len(queries))
	notFound := []int{-1, -1}
	for i, v := range queries {
		if p, ok := checkMap[v[1]^v[0]]; ok {
			result[i] = []int{p.l, p.r}
		} else {
			result[i] = notFound
		}
	}
	return result
}
```
