---
weight: 2492
title: "2492. Circular Sentence"
---

# 题目

You are given a positive integer n representing n cities numbered from 1 to n. You are also given a 2D array roads where roads[i] = [ai, bi, distancei] indicates that there is a bidirectional road between cities ai and bi with a distance equal to distancei. The cities graph is not necessarily connected.

The score of a path between two cities is defined as the minimum distance of a road in this path.

Return the minimum possible score of a path between cities 1 and n.

Note:

- A path is a sequence of roads between two cities.
- It is allowed for a path to contain the same road multiple times, and you can visit cities 1 and n multiple times along the path.
- The test cases are generated such that there is at least one path between 1 and n.

Example 1:

```
Input: n = 4, roads = [[1,2,9],[2,3,6],[2,4,5],[1,4,7]]
Output: 5
Explanation: The path from city 1 to 4 with the minimum score is: 1 -> 2 -> 4. The score of this path is min(9,5) = 5.
It can be shown that no other path has less score.
```

Example 2:

```
Input: n = 4, roads = [[1,2,2],[1,3,4],[3,4,7]]
Output: 2
Explanation: The path from city 1 to 4 with the minimum score is: 1 -> 2 -> 1 -> 3 -> 4. The score of this path is min(2,2,4,7) = 2.
```
 
Constraints:

- $2 <= n <= 10^5$
- $1 <= roads.length <= 10^5$
- roads[i].length == 3
- $1 <= a_i, b_i <= n$
- $a_i != b_i$
- $1 <= distancei <= 10^4$
- There are no repeated edges.
- There is at least one path between 1 and n.


# 思路1 并查集

## 分析

- 读清楚题目，其实就是找从1出发的所有连通路上的最短的路
- 本身就是两个思路bfs和并查集
- 并查集在这里就是找到所有的和1在一条连通路的点，然后从道路中找到这些点的最短道路

## 代码

```go
type unionFind struct {
	parent []int
}

func initUnionFind(n int) unionFind {
	u := unionFind{}
	u.parent = make([]int, n)
	for i := range u.parent {
		u.parent[i] = i
	}
	return u
}

func (u unionFind) find(a int) int {
	ap := u.parent[a]
	// 找到最终节点
	for ap != u.parent[ap] {
		ap = u.parent[ap]
	}
	// 沿途都赋值最终节点
	for a != ap {
		u.parent[a], a = ap, u.parent[a]
	}
	return ap
}

func (u unionFind) merge(a, b int) {
	// b的父节点等于a的父节点，就是将两个点合并
	u.parent[u.find(b)] = u.find(a)
}

func min(a, b int) int {
	if b < a {
		return b
	}
	return a
}

func minScore(n int, roads [][]int) int {
	union := initUnionFind(n + 1)
	for _, v := range roads {
		x, y := v[0], v[1]
		// 建立关系
		union.merge(x, y)
	}
	result := math.MaxInt
	for _, item := range roads {
		x, v := item[0], item[2]
		// 如果点和第一个点有关系代表能到达，那么就看路径是不是最小
		if union.find(x) == union.find(1) {
			result = min(result, v)
		}
	}
	return result
}
```

# 思路2 bfs

## 思路

- 使用bfs将所有路都走一边，然后从能走到所有节点中找到连接的最短路径
