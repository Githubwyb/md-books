---
weight: 101
title: "101. Symmetric Tree"
---

# 题目

Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).

# 思路1

## 分析

- 就是递归看节点左右子树是否对称嘛

## 代码实现

```go
func checkSymmetric(a *TreeNode, b *TreeNode) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}

	return a.Val == b.Val && checkSymmetric(a.Left, b.Right) && checkSymmetric(a.Right, b.Left)
}

func isSymmetric(root *TreeNode) bool {
	return checkSymmetric(root.Left, root.Right)
}
```

# 思路2

## 分析

- 不用递归，搞两个链表，广度优先遍历，只不过顺序反一下

## 代码实现

```go
func isSymmetric(root *TreeNode) bool {
	if root.Left == nil && root.Right == nil {
		return true
	}
	if root.Left == nil || root.Right == nil {
		return false
	}
	var l list.List
	var r list.List
	l.PushBack(root.Left)
	r.PushBack(root.Right)
	for l.Len() != 0 {
		lt := l.Front().Value.(*TreeNode)
		l.Remove(l.Front())
		rt := r.Front().Value.(*TreeNode)
		r.Remove(r.Front())
		if lt == nil && rt == nil {
			continue
		}
		if (lt == nil || rt == nil) || lt.Val != rt.Val {
			return false
		}

		l.PushBack(lt.Left)
		r.PushBack(rt.Right)
		l.PushBack(lt.Right)
		r.PushBack(rt.Left)
	}
	return true
}
```
