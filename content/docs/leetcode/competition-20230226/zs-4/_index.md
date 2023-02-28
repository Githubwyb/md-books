---
weight: 6366
title: "6366. Minimum Time to Visit a Cell In a Grid"
---

# 题目

You are given a m x n matrix grid consisting of non-negative integers where grid[row][col] represents the minimum time required to be able to visit the cell (row, col), which means you can visit the cell (row, col) only when the time you visit it is greater than or equal to grid[row][col].

You are standing in the top-left cell of the matrix in the 0th second, and you must move to any adjacent cell in the four directions: up, down, left, and right. Each move you make takes 1 second.

Return the minimum time required in which you can visit the bottom-right cell of the matrix. If you cannot visit the bottom-right cell, then return -1.


Example 1:

```
Input: grid = [[0,1,3,2],[5,1,2,5],[4,3,8,6]]
Output: 7
Explanation: One of the paths that we can take is the following:
- at t = 0, we are on the cell (0,0).
- at t = 1, we move to the cell (0,1). It is possible because grid[0][1] <= 1.
- at t = 2, we move to the cell (1,1). It is possible because grid[1][1] <= 2.
- at t = 3, we move to the cell (1,2). It is possible because grid[1][2] <= 3.
- at t = 4, we move to the cell (1,1). It is possible because grid[1][1] <= 4.
- at t = 5, we move to the cell (1,2). It is possible because grid[1][2] <= 5.
- at t = 6, we move to the cell (1,3). It is possible because grid[1][3] <= 6.
- at t = 7, we move to the cell (2,3). It is possible because grid[1][3] <= 7.
The final time is 7. It can be shown that it is the minimum time possible.
```

Example 2:

```
Input: grid = [[0,2,4],[3,2,1],[1,0,4]]
Output: -1
Explanation: There is no path from the top left to the bottom-right cell.
```

Constraints:

- m == grid.length
- n == grid[i].length
- 2 <= m, n <= 1000
- $4 <= m * n <= 10^5$
- $0 <= grid[i][j] <= 10^5$
- grid[0][0] == 0

# 思路1 Dijkstra

## 分析

- 由于可以两个格子跳来跳去来耗时间，那么不能到达的情况只有从第一个格子就跳不出去
- 除了这种情况，每个格子到下一个格子的时间要么是当前时间加一，要么是跳来跳去几次后加一（达到下一个格子的要求时间）
- 抽象想一下，好像是一个相邻格子的花费时间不一样的路径问题
- 距离不一样使用bfs不好写，使用Dijkstra算法写更好，相邻格子的距离就是当前时间加一和目的格子要求的时间的较大的那一个
- 因为跳来跳去加的是2，所以要注意奇偶，奇偶和当前的位置`m+n`一致

## 代码

```go
type locationT struct {
	x, y     int
	distance int
}
type LittleHeap []locationT

func (h *LittleHeap) Len() int { return len(*h) }

// less必须满足当Less(i, j)和Less(j, i)都为false，则两个索引对应的元素相等
// 为true，i向栈顶移动；为false，j向栈顶移动
func (h *LittleHeap) Less(i, j int) bool { return (*h)[i].distance < (*h)[j].distance }
func (h *LittleHeap) Swap(i, j int)      { (*h)[i], (*h)[j] = (*h)[j], (*h)[i] }
func (h *LittleHeap) Push(x interface{}) {
	*h = append(*h, x.(locationT))
}

func (h *LittleHeap) Pop() interface{} {
	x := (*h)[len(*h)-1]
	*h = (*h)[:len(*h)-1]
	return x
}

func max(a, b int) int {
	if a < b {
		return b
	}
	return a
}

func minimumTime(grid [][]int) int {
	if grid[1][0] > 1 && grid[0][1] > 1 {
		return -1
	}
	var arrLoc [][]int = [][]int{
		{1, 0},
		{-1, 0},
		{0, 1},
		{0, -1},
	}

	m, n := len(grid), len(grid[0])
	var lHeap LittleHeap = make([]locationT, 0, m*n)
	lHeap = append(lHeap, locationT{
		x: 0, y: 0, distance: 0,
	})

	disMap := make([][]int, m)
	for i := range disMap {
		disMap[i] = make([]int, n)
		for j := range disMap[i] {
			disMap[i][j] = math.MaxInt
		}
	}
	// 一定能到，所以不用加判断条件
	// 不能到的上面干掉了
	for {
		tmp := heap.Pop(&lHeap).(locationT)
		if tmp.x == m-1 && tmp.y == n-1 {
			return tmp.distance
		}
		for _, v := range arrLoc {
			x, y := tmp.x+v[0], tmp.y+v[1]
			if x < 0 || x >= m || y < 0 || y >= n {
				continue
			}
			dis := max(tmp.distance+1, grid[x][y])
			dis += (dis - x - y) % 2
			if dis < disMap[x][y] {
				disMap[x][y] = dis
				heap.Push(&lHeap, locationT{
					x: x, y: y, distance: dis,
				})

			}
		}
	}
}
```

# 思路2 二分+bfs

## 分析

- 找单调性，假设结果为endTime，大于endTime肯定能到达，小于endTime到达不了，那么就可以用二分
- 上限就是最大值加上路上花费的时间，理解就是时间先达到最大，那么每个点都可以到，直接走就可以到达终点，时间 $10^5 + m + n$
- 二分的中间结果如何判断，直接使用bfs即可，但是从起点走算结果比较复杂，所以从终点走，看能不能到达起点
- 节省空间的写法，走过的点可以使用当前结果作为true，非当前结果作为false，二分一定不会重复判断同一个结果
- 因为从终点走，需要注意终点的耗时需要进行判断，小于终点的耗时是不可达的。并且需要根据`m+n`的奇偶性做结果的修正，参考上面

## 代码

```go
func minimumTime1(grid [][]int) int {
	if grid[1][0] > 1 && grid[0][1] > 1 {
		return -1
	}
	var arrLoc [][]int = [][]int{
		{1, 0},
		{-1, 0},
		{0, 1},
		{0, -1},
	}

	m, n := len(grid), len(grid[0])
	// 用是否等于当前的endTime来标记是否走过
	seen := make([][]int, m)
	for i := range seen {
		seen[i] = make([]int, n)
	}
	type pointT struct {
		x, y int
	}
	q1 := make([]pointT, 0, m+n)
	q2 := make([]pointT, 0, m+n)
	endTime := sort.Search(1e5+m+n, func(endTime int) bool {
		if endTime < grid[m-1][n-1] {
			return false
		}
		q1 = q1[:0]
		q1 = append(q1, pointT{
			x: m - 1, y: n - 1,
		})
		seen[m-1][n-1] = endTime
		for t := endTime - 1; len(q1) > 0; t-- {
			q2 = q2[:0]
			for _, point := range q1 {
				for _, v := range arrLoc {
					x, y := point.x+v[0], point.y+v[1]
					if x < 0 || x >= m || y < 0 || y >= n || seen[x][y] == endTime || grid[x][y] > t {
						continue
					}
					if x == 0 && y == 0 {
						return true
					}
					seen[x][y] = endTime
					q2 = append(q2, pointT{
						x: x, y: y,
					})
				}
			}
			q1, q2 = q2, q1
		}
		return false
	})
	return endTime + (endTime+m+n)%2
}
```
