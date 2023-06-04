---
weight: 2576
title: "2576. Find the Maximum Number of Marked Indices"
---

# 题目

You are given a 0-indexed integer array nums.

Initially, all of the indices are unmarked. You are allowed to make this operation any number of times:

Pick two different unmarked indices i and j such that 2 * nums[i] <= nums[j], then mark i and j.
Return the maximum possible number of marked indices in nums using the above operation any number of times.

Example 1:

```
Input: nums = [3,5,2,4]
Output: 2
Explanation: In the first operation: pick i = 2 and j = 1, the operation is allowed because 2 * nums[2] <= nums[1]. Then mark index 2 and 1.
It can be shown that there's no other valid operation so the answer is 2.
```

Example 2:

```
Input: nums = [9,2,5,4]
Output: 4
Explanation: In the first operation: pick i = 3 and j = 0, the operation is allowed because 2 * nums[3] <= nums[0]. Then mark index 3 and 0.
In the second operation: pick i = 1 and j = 2, the operation is allowed because 2 * nums[1] <= nums[2]. Then mark index 1 and 2.
Since there is no other operation, the answer is 4.
```

Example 3:

```
Input: nums = [7,6,8]
Output: 0
Explanation: There is no valid operation to do, so the answer is 0.
```

Constraints:

- $1 <= nums.length <= 10^5$
- $1 <= nums[i] <= 10^9$

# 思路1 二分

## 分析

- 从最小的开始，最小的可以匹配某一个数之后的所有数
- 那么可以从小的找到大于等于k个可以找到另一半的数
- 选取2k个数有很多种选法，但可以选前k个数和后k个数
- 证明：反证，假设存在一个选法不是前k个数和后k个数。假设是前k个数中有一个空位，那么此空位可以替换第k+1个数，同样满足条件，因为数更小，乘以2也满足小于等于的条件
- 那么就简单了，直接二分查找k即可

## 代码

- k的范围是0到 $\frac{n}{2}$
- 二分查找第一个不满足条件的，所以二分的范围应该是1到 $\frac{n}{2} + 1$

```go
func maxNumOfMarkedIndices(nums []int) int {
	sort.Ints(nums)
	n := len(nums)

	// 二分的范围是1到n/2 + 1
	// 转化一下初始值为1，二分进去的数要加一，出来的数是第一个不满足条件的，需要减一乘2
	// 可是初始值加了1就不用减了，直接乘2返回
	return sort.Search(n/2, func(k int) bool {
		k++
		for i := 0; i < k; i++ {
			if nums[i]*2 > nums[n-k+i] {
				return true
			}
		}
		return false
	}) * 2
}
```
