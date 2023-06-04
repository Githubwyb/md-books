---
weight: 2448
title: "2448. Minimum Cost to Make Array Equal"
---

# 题目

You are given two 0-indexed arrays nums and cost consisting each of n positive integers.

You can do the following operation any number of times:

- Increase or decrease any element of the array nums by 1.

The cost of doing one operation on the ith element is cost[i].

Return the minimum total cost such that all the elements of the array nums become equal.

Example 1:

```
Input: nums = [1,3,5,2], cost = [2,3,1,14]
Output: 8
Explanation: We can make all the elements equal to 2 in the following way:
- Increase the 0th element one time. The cost is 2.
- Decrease the 1st element one time. The cost is 3.
- Decrease the 2nd element three times. The cost is 1 + 1 + 1 = 3.
The total cost is 2 + 3 + 3 = 8.
It can be shown that we cannot make the array equal with a smaller cost.
```

Example 2:

```
Input: nums = [2,2,2,2,2], cost = [4,2,8,1,3]
Output: 0
Explanation: All the elements are already equal, so no operations are needed.
```

Constraints:

- n == nums.length == cost.length
- $1 <= n <= 10^5$
- $1 <= nums[i], cost[i] <= 10^6$

# 思路1 中位数

## 分析

- 把cost看成数字的数量
- 从最小的数开始，向上加一，比选择的数小的都要加一，大的都要减一
- 最小的cost就是不管向上还是向下，比选择的数大的和小的应该相等，那不就是中位数

## 代码

```go
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func minCost(nums []int, cost []int) int64 {
	type item struct {
		val, count int
	}
	countMap := make([]item, len(nums))
	sum := 0
	for i, v := range nums {
		countMap[i] = item{
			val:   v,
			count: cost[i],
		}
		sum += cost[i]
	}
	sort.Slice(countMap, func(i, j int) bool { return countMap[i].val < countMap[j].val })
	midI := sum / 2
	median := 0
	for _, v := range countMap {
		if midI < v.count {
			median = v.val
			break
		}
		midI -= v.count
	}
	var res int64 = 0
	// 所有数变成中位数
	for _, v := range countMap {
		res += int64(abs(median-v.val) * v.count)
	}
	return res
}
```
