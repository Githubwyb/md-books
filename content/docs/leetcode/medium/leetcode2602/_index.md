---
weight: 2602
title: "2602. Minimum Operations to Make All Array Elements Equal"
---

# 题目

You are given an array nums consisting of positive integers.

You are also given an integer array queries of size m. For the ith query, you want to make all of the elements of nums equal to queries[i]. You can perform the following operation on the array any number of times:

- Increase or decrease an element of the array by 1.

Return an array answer of size m where answer[i] is the minimum number of operations to make all elements of nums equal to queries[i].

Note that after each query the array is reset to its original state.

Example 1:

```
Input: nums = [3,1,6,8], queries = [1,5]
Output: [14,10]
Explanation: For the first query we can do the following operations:
- Decrease nums[0] 2 times, so that nums = [1,1,6,8].
- Decrease nums[2] 5 times, so that nums = [1,1,1,8].
- Decrease nums[3] 7 times, so that nums = [1,1,1,1].
So the total number of operations for the first query is 2 + 5 + 7 = 14.
For the second query we can do the following operations:
- Increase nums[0] 2 times, so that nums = [5,1,6,8].
- Increase nums[1] 4 times, so that nums = [5,5,6,8].
- Decrease nums[2] 1 time, so that nums = [5,5,5,8].
- Decrease nums[3] 3 times, so that nums = [5,5,5,5].
So the total number of operations for the second query is 2 + 4 + 1 + 3 = 10.
```

Example 2:

```
Input: nums = [2,9,6,3], queries = [10]
Output: [20]
Explanation: We can increase each value in the array to 10. The total number of operations will be 8 + 1 + 4 + 7 = 20.
```

Constraints:

- n == nums.length
- m == queries.length
- $1 <= n, m <= 10^5$
- $1 <= nums[i], queries[i] <= 10^9$

# 思路1 提前处理

## 分析

- 虽然写出来了，但是写的复杂了，不过多讲了

## 代码

```go
func minOperations(nums []int, queries []int) []int64 {
	sort.Ints(nums)
	n := len(nums)
	tmp := make([]int64, n)
	for _, v := range nums {
		tmp[0] += int64(v - nums[0])
	}
	for i, v := range nums {
		if i == 0 {
			continue
		}
		tmp[i] = tmp[i-1] - int64((n-i-i)*(v-nums[i-1]))
	}
	res := make([]int64, len(queries))
	for j, v := range queries {
		index := sort.Search(n, func(i int) bool {
			return nums[i] >= v
		})
		if index == n {
			res[j] = tmp[index-1] + int64(n*(v-nums[index-1]))
		} else {
			res[j] = tmp[index] + int64((nums[index]-v)*(n-index-index))
		}
	}
	return res
}
```

# 思路2 前缀和+二分

## 分析

- 灵神的解法，还是厉害，此类题直接前缀和求解最方便
- 假设要让数据所有数到达k，比k小的数到达k就是每一个都被k减去再加起来

$$
\sum_{i=1}^{x}k-nums[i] = x \times k - \sum_{i=1}^{x}nums[i]
$$

- 比k大的数为

$$
\sum_{i=x}^{n}nums[i]-k = \sum_{i=x}^{n}nums[i] - (n - x) \times k
$$

- 那么先求出所有的前缀和，再计算就很方便

## 代码

- 前缀和多一个防止越界
- 二分查找到的index为可以插入v的最合适位置
- 比k小的数计算为`index*k - prefixSum[index]`
- 比k大的数计算为`sum - prefixSum[index] - v * (n - index)`
- 合并化简`sum + v * (index * 2 - n) - prefixSum[index] * 2`

```go
func minOperations1(nums []int, queries []int) []int64 {
	sort.Ints(nums)
	n := len(nums)
	prefixSum := make([]int64, n+1) // 多一个防止越界
	var sum int64 = 0
	for i, v := range nums {
		sum += int64(v)
		prefixSum[i+1] = sum
	}

	// 开始二分找queries的位置计算
	res := make([]int64, len(queries))
	for i, v := range queries {
		index := sort.SearchInts(nums, v)
		res[i] = int64((index*2-n)*v) + sum - prefixSum[index] * 2
	}
	return res
}
```