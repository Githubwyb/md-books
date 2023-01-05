---
weight: 6279
title: "6279. Distinct Prime Factors of Product of Array"
---

# 题目

Given an array of positive integers nums, return the number of distinct prime factors in the product of the elements of nums.

Note that:

- A number greater than 1 is called prime if it is divisible by only 1 and itself.
- An integer val1 is a factor of another integer val2 if val2 / val1 is an integer.

Example 1:

```
Input: nums = [2,4,3,7,10,6]
Output: 4
Explanation:
The product of all the elements in nums is: 2 * 4 * 3 * 7 * 10 * 6 = 10080 = 25 * 32 * 5 * 7.
There are 4 distinct prime factors so we return 4.
```

Example 2:

```
Input: nums = [2,4,8,16]
Output: 1
Explanation:
The product of all the elements in nums is: 2 * 4 * 8 * 16 = 1024 = 210.
There is 1 distinct prime factor so we return 1.
```

Constraints:

- $1 <= nums.length <= 10^4$
- 2 <= nums[i] <= 1000

# 思路1 分别计算

## 分析

- 每一个数从2开始找因数，找到重新来
- 因数一定都是质数，因为合数可以由质数乘出来，那么到质数的时候已经为因数了

## 代码

```go
func distinctPrimeFactors(nums []int) int {
	set := make(map[int]bool)
	for _, v := range nums {
		// 从2开始除，因为如果找到质数直接除就好，找到合数能整除，在质数时已经除了
		for i := 2; i <= v; i++ {
			if v%i == 0 {
				set[i] = true
				v, i = v/i, 1
			}
		}
	}
	return len(set)
}
```
