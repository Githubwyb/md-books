---
weight: 2446
title: "2446. Determine if Two Events Have Conflict"
---

# 题目

给你一个链表的头节点 head 。

对于列表中的每个节点 node ，如果其右侧存在一个具有 严格更大 值的节点，则移除 node 。

返回修改后链表的头节点 head 。

示例 1：

输入：head = [5,2,13,3,8]
输出：[13,8]
解释：需要移除的节点是 5 ，2 和 3 。
- 节点 13 在节点 5 右侧。
- 节点 13 在节点 2 右侧。
- 节点 8 在节点 3 右侧。
示例 2：

输入：head = [1,1,1,1]
输出：[1,1,1,1]
解释：每个节点的值都是 1 ，所以没有需要移除的节点。

提示：

给定列表中的节点数目在范围 [1, 105] 内
1 <= Node.val <= 105

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
