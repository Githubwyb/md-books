---
weight: 2612
title: "2612. Minimum Reverse Operations"
---

# 题目

You are given an integer n and an integer p in the range [0, n - 1]. Representing a 0-indexed array arr of length n where all positions are set to 0's, except position p which is set to 1.

You are also given an integer array banned containing some positions from the array. For the ith position in banned, arr[banned[i]] = 0, and banned[i] != p.

You can perform multiple operations on arr. In an operation, you can choose a subarray with size k and reverse the subarray. However, the 1 in arr should never go to any of the positions in banned. In other words, after each operation arr[banned[i]] remains 0.

Return an array ans where for each i from [0, n - 1], ans[i] is the minimum number of reverse operations needed to bring the 1 to position i in arr, or -1 if it is impossible.

- A subarray is a contiguous non-empty sequence of elements within an array.
- The values of ans[i] are independent for all i's.
- The reverse of an array is an array containing the values in reverse order.

Example 1:

```
Input: n = 4, p = 0, banned = [1,2], k = 4
Output: [0,-1,-1,1]
Explanation: In this case k = 4 so there is only one possible reverse operation we can perform, which is reversing the whole array. Initially, 1 is placed at position 0 so the amount of operations we need for position 0 is 0. We can never place a 1 on the banned positions, so the answer for positions 1 and 2 is -1. Finally, with one reverse operation we can bring the 1 to index 3, so the answer for position 3 is 1.
```

Example 2:

```
Input: n = 5, p = 0, banned = [2,4], k = 3
Output: [0,-1,-1,-1,-1]
Explanation: In this case the 1 is initially at position 0, so the answer for that position is 0. We can perform reverse operations of size 3. The 1 is currently located at position 0, so we need to reverse the subarray [0, 2] for it to leave that position, but reversing that subarray makes position 2 have a 1, which shouldn't happen. So, we can't move the 1 from position 0, making the result for all the other positions -1.
```

Example 3:

```
Input: n = 4, p = 2, banned = [0,1,3], k = 1
Output: [-1,-1,0,-1]
Explanation: In this case we can only perform reverse operations of size 1. So the 1 never changes its position.
```

Constraints:

- $1 <= n <= 10^5$
- 0 <= p <= n - 1
- 0 <= banned.length <= n - 1
- 0 <= banned[i] <= n - 1
- 1 <= k <= n
- banned[i] != p
- all values in banned are unique

# 思路1 bfs

## 分析

- 不断反转，找步数，有点类似于最短路径，直接用bfs做
- 对于反转，从一个点开始不断反转，到一个点就是当前点步数加一，注意判断对应的点是否在banned和是否走过

## 代码

```go
func minReverseOperations(n int, p int, banned []int, k int) []int {
	res := make([]int, n)
	for _, v := range banned {
		res[v] = -1
	}
	// bfs开始跳
	pq := make([]int, 0, n)
	tmp := make([]int, 0, n)
	pq = append(pq, p)
	for len(pq) > 0 {
		pq, tmp = tmp, pq
		pq = pq[:0]
		for _, v := range tmp {
			// 以此点为跳板开始跳
			// i为v在翻转数组的下标，翻转数组最左边为0，最右边为n-1
			i := k - n + v
			if i < 0 {
				i = 0
			}
			for ; i < k && i <= v; i++ {
				// i是v在k中的位置，k的0在v-i
				// 要翻转到的位置为0才能去
				t := k - 1 - i + v - i
				if t != v && res[t] == 0 {
					res[t] = res[v] + 1
					pq = append(pq, t)
				}
			}
		}
	}
	for i, v := range res {
		if v == 0 {
			res[i] = -1
		}
	}
	res[p] = 0
	return res
}
```
