---
weight: 2646
title: "2646. Minimize the Total Price of the Trips"
---

# 题目

There exists an undirected and unrooted tree with n nodes indexed from 0 to n - 1. You are given the integer n and a 2D integer array edges of length n - 1, where edges[i] = [ai, bi] indicates that there is an edge between nodes ai and bi in the tree.

Each node has an associated price. You are given an integer array price, where price[i] is the price of the ith node.

The price sum of a given path is the sum of the prices of all nodes lying on that path.

Additionally, you are given a 2D integer array trips, where trips[i] = [starti, endi] indicates that you start the ith trip from the node starti and travel to the node endi by any path you like.

Before performing your first trip, you can choose some non-adjacent nodes and halve the prices.

Return the minimum total price sum to perform all the given trips.

Example 1:

```
Input: n = 4, edges = [[0,1],[1,2],[1,3]], price = [2,2,10,6], trips = [[0,3],[2,1],[2,3]]
Output: 23
Explanation: The diagram above denotes the tree after rooting it at node 2. The first part shows the initial tree and the second part shows the tree after choosing nodes 0, 2, and 3, and making their price half.
For the 1st trip, we choose path [0,1,3]. The price sum of that path is 1 + 2 + 3 = 6.
For the 2nd trip, we choose path [2,1]. The price sum of that path is 2 + 5 = 7.
For the 3rd trip, we choose path [2,1,3]. The price sum of that path is 5 + 2 + 3 = 10.
The total price sum of all trips is 6 + 7 + 10 = 23.
It can be proven, that 23 is the minimum answer that we can achieve.
```

Example 2:

```
Input: n = 2, edges = [[0,1]], price = [2,2], trips = [[0,0]]
Output: 1
Explanation: The diagram above denotes the tree after rooting it at node 0. The first part shows the initial tree and the second part shows the tree after choosing node 0, and making its price half.
For the 1st trip, we choose path [0]. The price sum of that path is 1.
The total price sum of all trips is 1. It can be proven, that 1 is the minimum answer that we can achieve.
```

Constraints:

- 1 <= n <= 50
- edges.length == n - 1
- 0 <= ai, bi <= n - 1
- edges represents a valid tree.
- price.length == n
- price[i] is an even integer.
- 1 <= price[i] <= 1000
- 1 <= trips.length <= 100
- 0 <= starti, endi <= n - 1

# 思路1 dfs+dfs

## 分析

- 因为是无环树，直接使用dfs找路径更简单，用bfs复杂了
- 路径是固定的，那么就是将所有的点走了几次统计出来，然后找最小的价格即可
- 选几个节点降价，并且要求不相邻，那么也是用dfs
- 从某个点开始，选和不选有两种价格，对于下一个相邻点也有选和不选两个价格
    - 选当前点，那么就是下个相邻的点一定不能选
    - 不选当前点，那么下个相邻的点可选可不选，找最小的即可
- 最终返回选和不选当前点的较小的那个即可

## 代码

```go
func min(a, b int) int {
	if a > b {
		return b
	}
	return a
}

func minimumTotalPrice(n int, edges [][]int, price []int, trips [][]int) int {
	rel := make([][]int, n)
	for _, v := range edges {
		x, y := v[0], v[1]
		rel[x] = append(rel[x], y)
		rel[y] = append(rel[y], x)
	}
	// 因为只有一条路，所以深度优先
	// 起点、终点、上一步（因为不存在环路，所以判断不回来即可）
	var dfs func(s, e, last int) bool
	cnt := make(map[int]int)
	dfs = func(s, e, last int) bool {
		if s == e {
			cnt[e]++
			return true
		}
		for _, v := range rel[s] {
			if v != last && dfs(v, e, s) {
				cnt[s]++
				return true
			}
		}
		return false
	}
	for _, v := range trips {
		dfs(v[0], v[1], -1)
	}

	// 单向，使用last即可防止回路
	// 返回选和不选的两个大小
	var dfs1 func(s, last int) (nch, ch int)
	dfs1 = func(s, last int) (nch int, ch int) {
		nch = cnt[s] * price[s]
		ch = nch / 2
		for _, v := range rel[s] {
			if v == last {
				continue
			}
			vnch, vch := dfs1(v, s)
			ch += vnch // 当前选中了就只能选择没选中的
			nch += min(vnch, vch)
		}
		return
	}
	// 随便找一个要走的点开始遍历
	nch, ch := dfs1(trips[0][0], -1)
	return min(nch, ch)
}
```

# 思路2 树上差分+dfs

## 分析

- 后面的计算最小值没什么好说的，但是前面的计算每个点走过的次数倒是可以优化
- cnt每个trip查询一遍整体时间复杂度为 $O(nq)$，那么可以使用树上差分配合Tarjan算法的LCA处理将此时间复杂度降到 $O(n + q)$
- 树上差分和Tarjan算法处理LCA自己搜一下，也可以看 [Tarjan处理LCA](https://githubwyb.github.io/blogs/2018-09-18-algorithmStudy/#11-1-Tarjan%E7%AE%97%E6%B3%95%E5%A4%84%E7%90%86LCA) 和 [树上差分](https://githubwyb.github.io/blogs/2018-09-18-algorithmStudy/#12-2-%E6%A0%91%E4%B8%8A%E5%B7%AE%E5%88%86)

## 代码

```go
func minimumTotalPrice1(n int, edges [][]int, price []int, trips [][]int) int {
	rel := make([][]int, n)
	for _, v := range edges {
		x, y := v[0], v[1]
		rel[x] = append(rel[x], y)
		rel[y] = append(rel[y], x)
	}

	// 树上差分计算cnt
	diff := make([]int, n)
	// 把查询都取出来，一次遍历全部查一遍
	qs := make(map[int][]int)
	for _, v := range trips {
		x, y := v[0], v[1]
		qs[x] = append(qs[x], y)
		if x != y {
			qs[y] = append(qs[y], x)
		}
	}
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
	// Tarjan算法计算公共祖先
	color := make([]bool, n)
	father := make([]int, n) // 每个节点的父节点
	var tarjan func(a, fa int)
	tarjan = func(a, fa int) {
		father[a] = fa
		for _, v := range rel[a] {
			if v == fa {
				continue
			}
			tarjan(v, a)
			// 进去出来后，将v为根节点的子树设置公共祖先为a
			merge(v, a)
		}

		// 查一下有没有要求的LCA
		for _, v := range qs[a] {
			if v != a && !color[v] {
				// 自己走到自己是可以计算的，要判断
				// v还没走到，继续
				continue
			}
			lca := find(v)
			diff[a]++
			diff[v]++
			diff[lca]--
			if lcaFa := father[lca]; lcaFa >= 0 {
				diff[lcaFa]--
			}
		}
		color[a] = true // a被灌了岩浆，也就是a的子树走完了，要向上走了
	}
	// 从0向下走
	tarjan(0, -1)

	// dfs，同时计算差分
	// 返回选和不选的两个大小
	var dfs1 func(s, fa int) (nch, ch, cnt int)
	dfs1 = func(s, fa int) (nch, ch, cnt int) {
		cnt = diff[s]
		for _, v := range rel[s] {
			if v == fa {
				continue
			}
			vnch, vch, ccnt := dfs1(v, s)
			ch += vnch // 当前选中了就只能选择没选中的
			nch += min(vnch, vch)
			cnt += ccnt // 当前节点cnt为自己的差分加上所有子节点cnt之和
		}
		nch += cnt * price[s]
		ch += cnt * price[s] / 2
		return
	}
	// 从根节点遍历
	nch, ch, _ := dfs1(0, -1)
	return min(nch, ch)
}
```
