---
weight: 2487
title: "2487. Remove Nodes From Linked List"
---

# 题目

You are given the head of a linked list.

Remove every node which has a node with a strictly greater value anywhere to the right side of it.

Return the head of the modified linked list.

Example 1:

```
Input: head = [5,2,13,3,8]
Output: [13,8]
Explanation: The nodes that should be removed are 5, 2 and 3.
- Node 13 is to the right of node 5.
- Node 13 is to the right of node 2.
- Node 8 is to the right of node 3.
```

Example 2:

```
Input: head = [1,1,1,1]
Output: [1,1,1,1]
Explanation: Every node has value 1, so no nodes are removed.
```

Constraints:

- The number of the nodes in the given list is in the range $[1, 10^5]$.
- $1 <= Node.val <= 10^5$

# 思路1 反向最大值遍历

## 分析

- 自己想的
- 将链表所有的val存到数组中，然后处理数据，让 $arr[i] = \max \limits_{i \le x < n}$ arr[x]
- 遍历链表，如果当前小于 $arr[i]$ ，就跳过，相等就赋值

## 代码

```go
func removeNodes(head *ListNode) *ListNode {
	cur := head
	arr := make([]int, 0, 1)
	for cur != nil {
		arr = append(arr, cur.Val)
		cur = cur.Next
	}
	max := arr[len(arr)-1]
	for i := len(arr) - 2; i >= 0; i-- {
		if max < arr[i] {
			max = arr[i]
		} else {
			arr[i] = max
		}
	}

	cur = head
	resultTmp := &ListNode{
		Next: head,
	}
	last := resultTmp
	for i := 0; i < len(arr); i++ {
		if cur.Val < arr[i] {
			last.Next = cur.Next
		} else {
			last = cur
		}
		cur = cur.Next
	}
	return resultTmp.Next
}
```

# 思路2 链表转数组处理

## 分析

- 将链表所有节点放到数组中
- 每放一个节点，查看前面的节点是否比它小，如果比它小就替代

## 代码

```go
func removeNodes1(head *ListNode) *ListNode {
	arr := make([]*ListNode, 0, 1)
	for p := head; p != nil; p = p.Next {
		t := len(arr) - 1
		for t >= 0 && arr[t].Val < p.Val {
			arr = arr[:t]
			t--
		}
		arr = append(arr, p)
	}
	for i := 0; i < len(arr)-1; i++ {
		arr[i].Next = arr[i+1]
	}
	return arr[0]
}
```
