---
weight: 2415
title: "2415. Reverse Odd Levels of Binary Tree"
---

# 题目

Given the root of a perfect binary tree, reverse the node values at each odd level of the tree.

For example, suppose the node values at level 3 are `[2,1,3,4,7,11,29,18]`, then it should become `[18,29,11,7,4,3,1,2]`.

Return the root of the reversed tree.

A binary tree is perfect if all parent nodes have two children and all leaves are on the same level.

The level of a node is the number of edges along the path between it and the root node.

Example 1:
- Input: root = `[2,3,5,8,13,21,34]`
- Output: `[2,5,3,8,13,21,34]`
- Explanation:
- The tree has only one odd level.
- The nodes at level 1 are `3, 5` respectively, which are reversed and become `5, 3`.

Example 2:
- Input: root = `[7,13,11]`
- Output: `[7,11,13]`
- Explanation:
- The nodes at level 1 are `13, 11`, which are reversed and become `11, 13`.

Example 3:
- Input: `root = [0,1,2,0,0,0,0,1,1,1,1,2,2,2,2]`
- Output: `[0,2,1,0,0,0,0,2,2,2,2,1,1,1,1]`
- Explanation:
- The odd levels have non-zero values.
- The nodes at level 1 were `1, 2`, and are `2, 1` after the reversal.
- The nodes at level 3 were `1, 1, 1, 1, 2, 2, 2, 2`, and are `2, 2, 2, 2, 1, 1, 1, 1` after the reversal.



Constraints:
- The number of nodes in the tree is in the range [1, 214].
- 0 <= Node.val <= 105
- root is a perfect binary tree.

# 思路1 广度优先遍历反转

## 分析

- 自己想的，先拿到广度优先遍历的结果
- 再遍历一遍，奇数层从右向左重新找子节点，偶数层从左向右找子节点

## 代码实现

```go
func reverseOddLevels(root *TreeNode) *TreeNode {
	if root == nil {
		return nil
	}
	// 转成广度遍历的数组
	nodeArr := []*TreeNode{root}
	for i := 0; i < len(nodeArr); i++ {
		tmp := nodeArr[i]
		if tmp.Left != nil {
			nodeArr = append(nodeArr, tmp.Left)
			tmp.Left = nil
		}
		if tmp.Right != nil {
			nodeArr = append(nodeArr, tmp.Right)
			tmp.Right = nil
		}
	}

	// 用数学计算遍历将对应的left和right全部替换完成
	layer := 0 // 层数
	layerItemSum := 1
	for index := 0; index < len(nodeArr); {
		nextBegin := index + layerItemSum
		if layer%2 == 1 {
			// 奇数层，倒序遍历添加孩子
			for i := layerItemSum - 1; i >= 0; i-- {
				if index+i >= len(nodeArr) {
					continue
				}
				// 下一层是偶数层，从头遍历
				leftIndex := nextBegin + (layerItemSum-1-i)*2
				rightIndex := leftIndex + 1
				if leftIndex < len(nodeArr) {
					nodeArr[index+i].Left = nodeArr[leftIndex]
				}
				if rightIndex < len(nodeArr) {
					nodeArr[index+i].Right = nodeArr[rightIndex]
				}

			}
		} else {
			// 偶数层，正序遍历添加孩子
			for i := 0; i < layerItemSum && index+i < len(nodeArr); i++ {
				// 下一层是奇数层，从尾部遍历
				leftIndex := nextBegin + layerItemSum*2 - 1 - i*2
				rightIndex := leftIndex - 1
				if leftIndex < len(nodeArr) {
					nodeArr[index+i].Left = nodeArr[leftIndex]
				}
				if rightIndex < len(nodeArr) {
					nodeArr[index+i].Right = nodeArr[rightIndex]
				}

			}
		}
		index += layerItemSum
		layer++
		layerItemSum *= 2
	}

	return root
}
```

# 思路2 bfs 交换值

## 分析

- 思路1想复杂了，实际上，只要交换值就可以了，不用动左右子节点的指针
- 还是广度优先遍历，获取到每一层，为奇数层时，遍历交换两边的值

## 代码实现

```go
func reverseOddLevels1(root *TreeNode) *TreeNode {
	if root == nil {
		return nil
	}

	q := []*TreeNode{root}
	for isOdd := 1; q[0].Left != nil; isOdd ^= 1 {
		// 将下一层放到一个新的数组中
		next := make([]*TreeNode, 0, len(q)*2)
		for _, node := range q {
			next = append(next, node.Left, node.Right)
		}
		q = next

		if isOdd == 0 {
			continue
		}
		// 如果是奇数层，将这一层反转值
		for i, n := 0, len(q); i < n/2; i++ {
			q[i].Val, q[n-1-i].Val = q[n-1-i].Val, q[i].Val
		}
	}
	return root
}
```

# 思路2 dfs 交换值

## 分析

- 使用dfs同样可以实现
- 此问题可以转成对称树的问题，奇数层交换，偶数层不交换
- 那么对左右子节点同时进行dfs，左边遍历到的节点和右边遍历到的节点，如果是奇数层交换值
- 然后对左右节点的左右子节点反过来

## 代码实现

```go
func dfs(node1 *TreeNode, node2 *TreeNode, isOdd bool) {
	if node1 == nil {
		return
	}
	if isOdd {
		node1.Val, node2.Val = node2.Val, node1.Val
	}
	dfs(node1.Left, node2.Right, !isOdd)
	dfs(node1.Right, node2.Left, !isOdd)
}

func reverseOddLevels2(root *TreeNode) *TreeNode {
	if root == nil {
		return nil
	}
	dfs(root.Left, root.Right, true)
	return root
}
```
