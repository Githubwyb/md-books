---
weight: 2684
title: "2684. Maximum Number of Moves in a Grid"
---

# 题目

You are given a 0-indexed m x n matrix grid consisting of positive integers.

You can start at any cell in the first column of the matrix, and traverse the grid in the following way:

- From a cell (row, col), you can move to any of the cells: (row - 1, col + 1), (row, col + 1) and (row + 1, col + 1) such that the value of the cell you move to, should be strictly bigger than the value of the current cell.

Return the maximum number of moves that you can perform.

Example 1:

```
Input: grid = [[2,4,3,5],[5,4,9,3],[3,4,2,11],[10,9,13,15]]
Output: 3
Explanation: We can start at the cell (0, 0) and make the following moves:
- (0, 0) -> (0, 1).
- (0, 1) -> (1, 2).
- (1, 2) -> (2, 3).
It can be shown that it is the maximum number of moves that can be made.
```

Example 2:

```
Input: grid = [[3,2,4],[2,1,9],[1,1,7]]
Output: 0
Explanation: Starting from any cell in the first column we cannot perform any moves.
```

Constraints:

- m == grid.length
- n == grid[i].length
- 2 <= m, n <= 1000
- $4 <= m * n <= 10^5$
- $1 <= grid[i][j] <= 10^6$

# 思路1 BFS 一列一列算

## 分析

- 每走一步一定会到下一列，那么最多的步数也就是列数减一
- 每一列开始推下一列可以走到哪些点，直到没有幸存者或到最后一列

## 代码

```go
func maxMoves(grid [][]int) int {
	m, n := len(grid), len(grid[0])
	pre := make([]bool, m) // 前一列
	cur := make([]bool, m) // 当前列
	// 从第一列出发，都能到
	for i := 0; i < m; i++ {
		cur[i] = true
	}
	for i := 1; i < n; i++ {
		pre, cur = cur, pre
		cnt := 0
		for j := 0; j < m; j++ {
			v := grid[j][i]
			check := (j > 0 && pre[j-1] && v > grid[j-1][i-1]) ||
				(pre[j] && v > grid[j][i-1]) ||
				(j < m-1 && pre[j+1] && v > grid[j+1][i-1])
			if check {
				cnt++
			}
			cur[j] = check
		}
		if cnt == 0 {
			return i - 1
		}
	}
	return n - 1
}
```

# 思路2 动态规划

## 分析

- 每个点都有一个答案，答案为可以走到的三个点的答案的最大值加一

## 代码

```go
func max(a, b int) int {
	if b > a {
		return b
	}
	return a
}

func maxMoves1(grid [][]int) int {
	m, n := len(grid), len(grid[0])
	last, cur := make([]int, m), make([]int, m)
	// 从最后一列向前递推，最后一列都是0步，不能再走了
	for i := n - 2; i >= 0; i-- {
		cur, last = last, cur
		for j := 0; j < m; j++ {
			v := grid[j][i]
			vc := 0
			// 取下面三个点可以到的点，取答案较大的那个
			if j > 0 && v < grid[j-1][i+1] {
				vc = max(vc, last[j-1]+1)
			}
			if v < grid[j][i+1] {
				vc = max(vc, last[j]+1)
			}
			if j < m-1 && v < grid[j+1][i+1] {
				vc = max(vc, last[j+1]+1)
			}
			cur[j] = vc
		}
	}
	res := 0
	for _, v := range cur {
		res = max(res, v)
	}
	return res
}
```
