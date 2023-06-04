---
weight: 2685
title: "2685. Count the Number of Complete Components"
---

# 题目

You are given an integer n. There is an undirected graph with n vertices, numbered from 0 to n - 1. You are given a 2D integer array edges where edges[i] = [ai, bi] denotes that there exists an undirected edge connecting vertices ai and bi.

Return the number of complete connected components of the graph.

A connected component is a subgraph of a graph in which there exists a path between any two vertices, and no vertex of the subgraph shares an edge with a vertex outside of the subgraph.

A connected component is said to be complete if there exists an edge between every pair of its vertices.

Example 1:

```
Input: n = 6, edges = [[0,1],[0,2],[1,2],[3,4]]
Output: 3
Explanation: From the picture above, one can see that all of the components of this graph are complete.
```

Example 2:

```
Input: n = 6, edges = [[0,1],[0,2],[1,2],[3,4],[3,5]]
Output: 1
Explanation: The component containing vertices 0, 1, and 2 is complete since there is an edge between every pair of two vertices. On the other hand, the component containing vertices 3, 4, and 5 is not complete since there is no edge between vertices 4 and 5. Thus, the number of complete components in this graph is 1.
```

Constraints:

- 1 <= n <= 50
- 0 <= edges.length <= n * (n - 1) / 2
- edges[i].length == 2
- 0 <= ai, bi <= n - 1
- ai != bi
- There are no repeated edges.

# 思路1 并查集找关系，计算边数量

## 分析

- 并查集可以将在一起的点合并成一个集合
- 对每个集合计算边的数量，每个集合v个节点，边的数量为 $\frac{v(v-1)}{2}$

## 代码

```go
func countCompleteComponents(n int, edges [][]int) int {
	// 使用并查集合并所有的点
	// 并查集模板
	uf := make([]int, n)
	for i := range uf {
		uf[i] = i
	}
	find := func(x int) int {
		ap := uf[x]
		// 找到最终节点
		for ap != uf[ap] {
			ap = uf[ap]
		}
		// 沿途都赋值最终节点
		for x != ap {
			uf[x], x = ap, uf[x]
		}
		return ap
	}
	// 把a的子集合并到b上，如果b是树根节点，a的所有子节点查找都会查找到b
	merge := func(a, b int) {
		uf[find(a)] = find(b)
	}

	// 并查集整理好
	for _, v := range edges {
		merge(v[0], v[1])
	}

	// 并查集的每个集合统计点数和边数
	pCnt := make([]int, n)
	eCnt := make([]int, n)
	for i := 0; i < n; i++ {
		pCnt[find(i)]++
	}
	for _, v := range edges {
		eCnt[find(v[0])]++
	}

	// 判断数量
	res := 0
	for i, v := range pCnt {
		if v == 0 {
			continue
		}
		if v*(v-1)/2 == eCnt[i] {
			res++
		}
	}
	return res
}
```

# 思路2

## 分析

- 使用dfs从每个点开始走，能走到的点都是联通块的点
- 统计这个联通块所有点的边数，联通块的点数，按照 $eCnt = pCnt \times (pCnt-1)$ 计算

## 代码

```go
func countCompleteComponents(n int, edges [][]int) int {
	g := make([][]int, n)
	for _, e := range edges {
		x, y := e[0], e[1]
		g[y] = append(g[y], x)
		g[x] = append(g[x], y)
	}

	vis := make([]bool, n)
	pCnt := 0
	eCnt := 0
	var dfs func(x int)
	dfs = func(x int) {
		vis[x] = true
		pCnt++
		eCnt += len(g[x])
		for _, v := range g[x] {
			if !vis[v] {
				dfs(v)
			}
		}
	}
	res := 0
	for i := 0; i < n; i++ {
		if !vis[i] {
			eCnt, pCnt = 0, 0
			dfs(i)
			if pCnt*(pCnt-1) == eCnt {
				res++
			}
		}
	}
	return res
}
```
