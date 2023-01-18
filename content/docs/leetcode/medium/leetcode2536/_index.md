---
weight: 2536
title: "2536. Increment Submatrices by One"
---

# 题目

You are given a positive integer n, indicating that we initially have an n x n 0-indexed integer matrix mat filled with zeroes.

You are also given a 2D integer array query. For each query[i] = [row1i, col1i, row2i, col2i], you should do the following operation:

- Add 1 to every element in the submatrix with the top left corner (row1i, col1i) and the bottom right corner (row2i, col2i). That is, add 1 to mat[x][y] for for all row1i <= x <= row2i and col1i <= y <= col2i.

Return the matrix mat after performing every query.

Example 1:

```
Input: n = 3, queries = [[1,1,2,2],[0,0,1,1]]
Output: [[1,1,0],[1,2,1],[0,1,1]]
Explanation: The diagram above shows the initial matrix, the matrix after the first query, and the matrix after the second query.
- In the first query, we add 1 to every element in the submatrix with the top left corner (1, 1) and bottom right corner (2, 2).
- In the second query, we add 1 to every element in the submatrix with the top left corner (0, 0) and bottom right corner (1, 1).
```

Example 2:

```
Input: n = 2, queries = [[0,0,1,1]]
Output: [[1,1],[1,1]]
Explanation: The diagram above shows the initial matrix and the matrix after the first query.
- In the first query we add 1 to every element in the matrix.
```

Constraints:

- 1 <= n <= 500
- $1 <= queries.length <= 10^4$
- 0 <= row1i <= row2i < n
- 0 <= col1i <= col2i < n

# 思路1 直接写

## 分析

- 据说会超时，不过我使用go好像处于C和python的中间状态，没有给超时

## 代码

```go
func rangeAddQueries(n int, queries [][]int) [][]int {
	result := make([][]int, n)
	for i := range result {
		result[i] = make([]int, n)
	}

	for _, v := range queries {
		for i := v[0]; i <= v[2]; i++ {
			for j := v[1]; j <= v[3]; j++ {
				result[i][j]++
			}
		}
	}
	return result
}
```

# 思路2 二维差分

## 分析

- 假设每一个query都是左上角到右下角，那么上面的时间复杂度就有点恐怖了
- 使用二维差分来做，每个元素影响自己右下角所有的点，那么query的左上就是1，右上就是-1，左下也是-1，右下就是1

| 0   | 0   | 0   |
| --- | --- | --- |
| 0   | 0   | 0   |
| 0   | 0   | 0   |

query = [0, 0, 1, 1]

| 1   | 0   | -1  |
| --- | --- | --- |
| 0   | 0   | 0   |
| -1  | 0   | 1   |

- 可以看出每个点的值都是包含自己的左上所有元素的和

| 1   | 1   | 0   |
| --- | --- | --- |
| 1   | 1   | 0   |
| 0   | 0   | 0   |

- 那么可以得出每个点的值是 $自己 + 左邻居 + 上邻居 - 左上邻居$

## 代码

```go
func rangeAddQueries1(n int, queries [][]int) [][]int {
	// 防止越界
	result := make([][]int, n+1)
	for i := range result {
		result[i] = make([]int, n+1)
	}

	for _, v := range queries {
		r1, c1, r2, c2 := v[0], v[1], v[2]+1, v[3]+1
		result[r1][c1] += 1
		result[r1][c2] -= 1
		result[r2][c1] -= 1
		result[r2][c2] += 1
	}

	for i := range result {
		result[i] = result[i][:n]
		for j := range result[i] {
			// 每个点都是其自身和左上所有元素的和
			// 那么每个点都是自己+左邻居+上邻居-坐上邻居
			add := 0
			if i > 0 {
				add += result[i-1][j]
			}
			if j > 0 {
				add += result[i][j-1]
			}
			if i > 0 && j > 0 {
				add -= result[i-1][j-1]
			}
			result[i][j] += add
		}
	}
	return result[:n]
}
```
