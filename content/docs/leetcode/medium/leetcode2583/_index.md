---
weight: 2583
title: "2583. Kth Largest Sum in a Binary Tree"
---

# 题目

You are given the root of a binary tree and a positive integer k.

The level sum in the tree is the sum of the values of the nodes that are on the same level.

Return the kth largest level sum in the tree (not necessarily distinct). If there are fewer than k levels in the tree, return -1.

Note that two nodes are on the same level if they have the same distance from the root.

Example 1:

```
Input: root = [5,8,9,2,1,3,7,4,6], k = 2
Output: 13
Explanation: The level sums are the following:
- Level 1: 5.
- Level 2: 8 + 9 = 17.
- Level 3: 2 + 1 + 3 + 7 = 13.
- Level 4: 4 + 6 = 10.
The 2nd largest level sum is 13.
```

Example 2:

```
Input: root = [1,2,null,3], k = 1
Output: 3
Explanation: The largest level sum is 3.
```

Constraints:

- The number of nodes in the tree is n.
- $2 <= n <= 10^5$
- $1 <= Node.val <= 10^6$
- 1 <= k <= n

# 思路1 bfs+小根堆

## 分析

- bfs遍历每一层
- 最小堆找第k大

## 代码

```go
type LittleHeap []int64

func (h *LittleHeap) Len() int { return len(*h) }

// less必须满足当Less(i, j)和Less(j, i)都为false，则两个索引对应的元素相等
// 为true，i向栈顶移动；为false，j向栈顶移动
func (h *LittleHeap) Less(i, j int) bool { return (*h)[i] < (*h)[j] }
func (h *LittleHeap) Swap(i, j int)      { (*h)[i], (*h)[j] = (*h)[j], (*h)[i] }
func (h *LittleHeap) Push(x interface{}) {
	*h = append(*h, x.(int64))
}

func (h *LittleHeap) Pop() interface{} {
	x := (*h)[len(*h)-1]
	*h = (*h)[:len(*h)-1]
	return x
}

/**
 * Definition for a binary tree node.
 * type TreeNode struct {
 *     Val int
 *     Left *TreeNode
 *     Right *TreeNode
 * }
 */
func kthLargestLevelSum(root *TreeNode, k int) int64 {
	q := make([]*TreeNode, 0, 1)
	tmp := make([]*TreeNode, 0, 1)
	bHeap := make(LittleHeap, 0, k)

	q = append(q, root)
	for len(q) > 0 {
		tmp, q = q, tmp
		var s int64 = 0
		q = q[:0]
		for _, node := range tmp {
			s += int64(node.Val)
			if node.Left != nil {
				q = append(q, node.Left)
			}
			if node.Right != nil {
				q = append(q, node.Right)
			}
		}
		if len(bHeap) < k {
			heap.Push(&bHeap, s)
		} else if s > bHeap[0] {
			heap.Pop(&bHeap)
			heap.Push(&bHeap, s)
		}
	}
	if len(bHeap) < k {
		return -1
	}
	return bHeap[0]
}
```
