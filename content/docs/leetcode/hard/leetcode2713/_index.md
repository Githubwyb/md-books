---
weight: 2713
title: "2713. Maximum Strictly Increasing Cells in a Matrix"
---

# 题目

Given a 1-indexed m x n integer matrix mat, you can select any cell in the matrix as your starting cell.

From the starting cell, you can move to any other cell in the same row or column, but only if the value of the destination cell is strictly greater than the value of the current cell. You can repeat this process as many times as possible, moving from cell to cell until you can no longer make any moves.

Your task is to find the maximum number of cells that you can visit in the matrix by starting from some cell.

Return an integer denoting the maximum number of cells that can be visited.

Example 1:

```
Input: mat = [[3,1],[3,4]]
Output: 2
Explanation: The image shows how we can visit 2 cells starting from row 1, column 2. It can be shown that we cannot visit more than 2 cells no matter where we start from, so the answer is 2.
```

Example 2:

```
Input: mat = [[1,1],[1,1]]
Output: 1
Explanation: Since the cells must be strictly increasing, we can only visit one cell in this example.
```

Example 3:

```
Input: mat = [[3,1,6],[-9,5,7]]
Output: 4
Explanation: The image above shows how we can visit 4 cells starting from row 2, column 1. It can be shown that we cannot visit more than 4 cells no matter where we start from, so the answer is 4.
```

Constraints:

- m == mat.length
- n == mat[i].length
- $1 <= m, n <= 10^5$
- $1 <= m * n <= 10^5$
- $-10^5 <= mat[i][j] <= 10^5$

# 思路1 从最小向最大进行动态规划

## 分析

- 直接找点遍历时间复杂度太高，动态的想一下，每个点为终点的值是其所在行和列的最大值加一
- 那么把每个点的最大值都算出来，找到整个矩阵最大的那个点就好了，怎么知道这个最大值一定是最大的呢
- 从最小的点开始，最小的点没人可以到，所以一定是1，那么向上一步一步算，每个算出来的都一定是最大值
- 优化时间复杂度，记录一下每行和每列的最大值方便计算

## 代码

```go
func maxIncreasingCells(mat [][]int) int {
	m, n := len(mat), len(mat[0])
	type pair struct{ i, j int }
	grp := make(map[int][]pair)
	rowMax := make([]int, m)
	colMax := make([]int, n)
	for i := range mat {
		for j, v := range mat[i] {
			grp[v] = append(grp[v], pair{i, j})
		}
	}
	keys := make([]int, 0, len(grp))
	for i := range grp {
		keys = append(keys, i)
	}
	sort.Ints(keys)

	res := 0
	for _, v := range keys {
		// 找这一行的最大值和这一列的最大值，因为从小到大遍历的，所以直接为其加一即可
		maxNums := make([]int, len(grp[v]))
		for i, p := range grp[v] {
			maxNums[i] = max(rowMax[p.i], colMax[p.j]) + 1
			res = max(res, maxNums[i])
		}
		for i, p := range grp[v] {
			rowMax[p.i] = max(rowMax[p.i], maxNums[i])
			colMax[p.j] = max(colMax[p.j], maxNums[i])
		}
	}
	return res
}

func max(a, b int) int {
	if a < b {
		return b
	}
	return a
}
```
