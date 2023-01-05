---
weight: 2488
title: "2488. Count Subarrays With Median K"
---

# 题目

You are given an array nums consisting of positive integers and an integer k.

Partition the array into two ordered groups such that each element is in exactly one group. A partition is called great if the sum of elements of each group is greater than or equal to k.

Return the number of distinct great partitions. Since the answer may be too large, return it modulo $10^9 + 7$.

Two partitions are considered distinct if some element nums[i] is in different groups in the two partitions.

Example 1:

```
Input: nums = [1,2,3,4], k = 4
Output: 6
Explanation: The great partitions are: ([1,2,3], [4]), ([1,3], [2,4]), ([1,4], [2,3]), ([2,3], [1,4]), ([2,4], [1,3]) and ([4], [1,2,3]).
```

Example 2:

```
Input: nums = [3,3,3], k = 4
Output: 0
Explanation: There are no great partitions for this array.
```

Example 3:

```
Input: nums = [6,6], k = 2
Output: 2
Explanation: We can either put nums[0] in the first partition or in the second partition.
The great partitions will be ([6], [6]) and ([6], [6]).
```

Constraints:

- 1 <= nums.length, k <= 1000
- $1 <= nums[i] <= 10^9$

# 思路1 逆向思维+背包方案数

## 分析

- 计算两边都大于不如计算一边小于的方案总数，然后用总方案减去
- 就是从nums取值，小于k就是一种，在另一个盒子中就是另一种，总数乘以2
- 计算小于k的方案数，可以使用动态规划，定义`f[i][j]`为前i个糖果取若干元素和为j的方案数，转移方程为
  - 不选第i个数：`f[i][j] = f[i-1][j]`
  - 选第i个数：`f[i][j] = f[i-1][j-nums[i]]`
- 综合`f[i][j] = f[i-1][j] + f[i-1][j-nums[i]]`
- 初始值`f[0][0] = 1`
- 坏分区个数为

$$ \sum_{0 \le i \le k-1} f[n][i] $$

- 动态规划方程中，`i`只和`i-1`相关，代码上只需要记录j即可，节省空间
- 总方案数为每个元素要么放左边要么放右边，也就是 $2^n$，边界情况一边没有计算到坏分区个数中

## 代码

```go
func countPartitions(nums []int, k int) int {
	const mod int = 1e9 + 7
	sum := 0
	for _, v := range nums {
		sum += v
	}
	if sum < k*2 {
		return 0
	}

	ans := 1
	f := make([]int, k)
	f[0] = 1
	// 从0算到n，不需要记录已经算过的值，即计算i时，使用i-1的结果，不关心i-2的
	for _, v := range nums {
		ans = ans * 2 % mod
		// 要加上j和j-nums[i]，那么j肯定要大于等于nums[i]
		// j只需要计算到k-1即可
		for j := k - 1; j >= v; j-- {
			// f[i][j] = f[i-1][j] + f[i-1][j-nums[i]]
			// 对于当前i来说，f存储的是i-1的值，那么就是f[j] = f[j] + f[j-nums[i]]
			f[j] = (f[j] + f[j-v]) % mod
		}
	}
	for _, v := range f {
		ans -= v * 2
	}
	return (ans%mod + mod) % mod
}
```
