---
weight: 2711
title: "2711. Difference of Number of Distinct Values on Diagonals"
---

# 题目

Given a 0-indexed 2D grid of size m x n, you should find the matrix answer of size m x n.

The value of each cell (r, c) of the matrix answer is calculated in the following way:

- Let topLeft[r][c] be the number of distinct values in the top-left diagonal of the cell (r, c) in the matrix grid.
- Let bottomRight[r][c] be the number of distinct values in the bottom-right diagonal of the cell (r, c) in the matrix grid.

Then answer[r][c] = |topLeft[r][c] - bottomRight[r][c]|.

Return the matrix answer.

A matrix diagonal is a diagonal line of cells starting from some cell in either the topmost row or leftmost column and going in the bottom-right direction until reaching the matrix's end.

A cell (r1, c1) belongs to the top-left diagonal of the cell (r, c), if both belong to the same diagonal and r1 < r. Similarly is defined bottom-right diagonal.

Example 1:

```
Input: grid = [[1,2,3],[3,1,5],[3,2,1]]
Output: [[1,1,0],[1,0,1],[0,1,1]]
Explanation: The 1st diagram denotes the initial grid.
The 2nd diagram denotes a grid for cell (0,0), where blue-colored cells are cells on its bottom-right diagonal.
The 3rd diagram denotes a grid for cell (1,2), where red-colored cells are cells on its top-left diagonal.
The 4th diagram denotes a grid for cell (1,1), where blue-colored cells are cells on its bottom-right diagonal and red-colored cells are cells on its top-left diagonal.
- The cell (0,0) contains [1,1] on its bottom-right diagonal and [] on its top-left diagonal. The answer is |1 - 0| = 1.
- The cell (1,2) contains [] on its bottom-right diagonal and [2] on its top-left diagonal. The answer is |0 - 1| = 1.
- The cell (1,1) contains [1] on its bottom-right diagonal and [1] on its top-left diagonal. The answer is |1 - 1| = 0.
The answers of other cells are similarly calculated.
```

Example 2:

```
Input: grid = [[1]]
Output: [[0]]
Explanation: - The cell (0,0) contains [] on its bottom-right diagonal and [] on its top-left diagonal. The answer is |0 - 0| = 0.
```

Constraints:

- m == grid.length
- n == grid[i].length
- 1 <= m, n, grid[i][j] <= 50

# 思路1 暴力破解

## 分析

- 第一行和第一列开始，找对角线每个元素的左上不同元素个数，找一个数组统计出来
- 然后再次遍历此对角线，统计出右下的不同元素个数，右下可以用总个数减去当前来进行计算
- 整体所有元素遍历了两遍，复杂度 $O(mn)$

## 代码

```go
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func differenceOfDistinctValues(grid [][]int) [][]int {
	m, n := len(grid), len(grid[0])
	res := make([][]int, m)
	for i := range res {
		res[i] = make([]int, n)
	}
	tl := make([]int, 0, m)
	getAns := func(is, js int) {
		tlMap := make(map[int]int)
		tl = tl[:0]
		// 第一遍统计左上角的数量并记录在tl中
		for i, j := is, js; i < m && j < n; i, j = i+1, j+1 {
			tl = append(tl, len(tlMap))
			tlMap[grid[i][j]]++
		}
		// 第二遍计算右下角数量
		for i, j, k := is, js, 0; i < m && j < n; i, j, k = i+1, j+1, k+1 {
			v := grid[i][j]
			if tlMap[v] <= 1 {
				delete(tlMap, v)
			} else {
				tlMap[v]--
			}
			res[i][j] = abs(len(tlMap) - tl[k])
		}
	}
	for i := 0; i < n; i++ {
		getAns(0, i)
	}
	for i := 1; i < m; i++ {
		getAns(i, 0)
	}
	return res
}
```
