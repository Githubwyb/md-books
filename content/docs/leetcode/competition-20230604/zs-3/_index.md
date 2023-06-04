---
weight: 6472
title: "6472. Sum of Matrix After Queries"
---

# 题目

You are given an integer n and a 0-indexed 2D array queries where queries[i] = [typei, indexi, vali].

Initially, there is a 0-indexed n x n matrix filled with 0's. For each query, you must apply one of the following changes:

- if typei == 0, set the values in the row with indexi to vali, overwriting any previous values.
- if typei == 1, set the values in the column with indexi to vali, overwriting any previous values.

Return the sum of integers in the matrix after all queries are applied.

Example 1:

```
Input: n = 3, queries = [[0,0,1],[1,2,2],[0,2,3],[1,0,4]]
Output: 23
Explanation: The image above describes the matrix after each query. The sum of the matrix after all queries are applied is 23.
```

Example 2:

```
Input: n = 3, queries = [[0,0,4],[0,1,2],[1,0,1],[0,2,3],[1,2,1]]
Output: 17
Explanation: The image above describes the matrix after each query. The sum of the matrix after all queries are applied is 17.
```

Constraints:

- $1 <= n <= 10^4$
- $1 <= queries.length <= 5 * 10^4$
- queries[i].length == 3
- 0 <= typei <= 1
- 0 <= indexi < n
- $0 <= vali <= 10^5$


# 思路1 倒序处理

## 分析

- 正序处理要考虑可能会被后面给覆盖，要记录每一个位置的数值，覆盖要替换
- 倒序处理只需要考虑前面有没有处理过即可，只需要记录处理过的行号和列号，处理过不计算即可
- 使用一个map的数组，0代表行的哈希map，1代表列的哈希map
- 0和1的互转使用`x^1`

## 代码

```go
func matrixSumQueries(n int, queries [][]int) int64 {
	// 倒序处理queries
	gMap := [2]map[int]bool{{}, {}}
	var sum int64 = 0
	for i := len(queries) - 1; i >= 0; i-- {
		t, i, v := queries[i][0], queries[i][1], queries[i][2]
		if gMap[t][i] {
			// 已经操作过，跳过
			continue
		}
		gMap[t][i] = true
		sum += int64(v * (n - len(gMap[t^1])))
	}
	return sum
}
```
