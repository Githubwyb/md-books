---
weight: 2462
title: "2462. Total Cost to Hire K Workers"
---

# 题目

You are given a 0-indexed integer array costs where costs[i] is the cost of hiring the ith worker.

You are also given two integers k and candidates. We want to hire exactly k workers according to the following rules:

- You will run k sessions and hire exactly one worker in each session.
- In each hiring session, choose the worker with the lowest cost from either the first candidates workers or the last candidates workers. Break the tie by the smallest index.
	- For example, if costs = [3,2,7,7,1,2] and candidates = 2, then in the first hiring session, we will choose the 4th worker because they have the lowest cost [3,2,7,7,1,2].
	- In the second hiring session, we will choose 1st worker because they have the same lowest cost as 4th worker but they have the smallest index [3,2,7,7,2]. Please note that the indexing may be changed in the process.
- If there are fewer than candidates workers remaining, choose the worker with the lowest cost among them. Break the tie by the smallest index.
- A worker can only be chosen once.

Return the total cost to hire exactly k workers.

Example 1:

```
Input: costs = [17,12,10,2,7,2,11,20,8], k = 3, candidates = 4
Output: 11
Explanation: We hire 3 workers in total. The total cost is initially 0.
- In the first hiring round we choose the worker from [17,12,10,2,7,2,11,20,8]. The lowest cost is 2, and we break the tie by the smallest index, which is 3. The total cost = 0 + 2 = 2.
- In the second hiring round we choose the worker from [17,12,10,7,2,11,20,8]. The lowest cost is 2 (index 4). The total cost = 2 + 2 = 4.
- In the third hiring round we choose the worker from [17,12,10,7,11,20,8]. The lowest cost is 7 (index 3). The total cost = 4 + 7 = 11. Notice that the worker with index 3 was common in the first and last four workers.
The total hiring cost is 11.
```

Example 2:

```
Input: costs = [1,2,4,1], k = 3, candidates = 3
Output: 4
Explanation: We hire 3 workers in total. The total cost is initially 0.
- In the first hiring round we choose the worker from [1,2,4,1]. The lowest cost is 1, and we break the tie by the smallest index, which is 0. The total cost = 0 + 1 = 1. Notice that workers with index 1 and 2 are common in the first and last 3 workers.
- In the second hiring round we choose the worker from [2,4,1]. The lowest cost is 1 (index 2). The total cost = 1 + 1 = 2.
- In the third hiring round there are less than three candidates. We choose the worker from the remaining workers [2,4]. The lowest cost is 2 (index 0). The total cost = 2 + 2 = 4.
The total hiring cost is 4.
```

Constraints:

- $1 <= costs.length <= 10^5$
- $1 <= costs[i] <= 10^5$
- 1 <= k, candidates <= costs.length

# 思路1

## 分析 小根堆

- 将candicate建堆，索引和cost一起作为小根堆的less，然后k次选择，出堆入堆即可

## 代码

```go
func maximumSubarraySum(nums []int, k int) int64 {
	numMap := make(map[int]int) // value为最近一次出现的索引
	var res int64 = 0
	var add int64 = 0
	l := 0 // 左指针，包含
	for r, v := range nums {
		add += int64(v)
		index, ok := numMap[v]
		if ok && index >= l {
			// 找到相等的，并且就在范围内，将左侧左移到index右边
			for i := l; i <= index; i++ {
				add -= int64(nums[i])
			}
			l = index + 1
		} else if r-l == k-1 {
			if add > res {
				res = add
			}
			add -= int64(nums[l])
			l++
		}
		numMap[v] = r
	}
	return res
}
```

# 思路2 两个小根堆

## 分析

- 灵神的写法，复用原数组做两个最小堆
- 重叠的话就将最小堆合并然后排序选取

## 代码

- go里面建堆直接复用原数组，没有申请空间

```go
// 用不着Push和Pop，随便实现一下
type lhp struct{ sort.IntSlice }

func (lhp) Push(interface{})     {}
func (lhp) Pop() (_ interface{}) { return }

func totalCost1(costs []int, k int, candidates int) int64 {
	var ans int64 = 0
	// 在原始数据上进行建堆
	n := len(costs)
	if candidates*2 < n {
		// 比n小就建两个堆
		pre := lhp{costs[:candidates]}
		suf := lhp{costs[n-candidates:]}
		heap.Init(&pre)
		heap.Init(&suf)
		for i, j := candidates, n-candidates-1; i <= j && k > 0; k-- {
			if pre.IntSlice[0] <= suf.IntSlice[0] {
				// 选前面的
				ans += int64(pre.IntSlice[0])
				// 将中间的赋值给前面的
				pre.IntSlice[0] = costs[i]
				heap.Fix(&pre, 0)
				i++
			} else {
				ans += int64(suf.IntSlice[0])
				suf.IntSlice[0] = costs[j]
				heap.Fix(&suf, 0)
				j--
			}
		}
		if k == 0 {
			return ans
		}
		// 取了几个后，重叠了，剩下的合并成一个数组
		costs = append(pre.IntSlice, suf.IntSlice...)
	}
	sort.Ints(costs)
	for _, c := range costs[:k] {
		ans += int64(c)
	}
	return ans
}
```
