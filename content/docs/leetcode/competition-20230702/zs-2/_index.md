---
weight: 6916
title: "6916. Prime Pairs With Target Sum"
---

# 题目

You are given an integer n. We say that two integers x and y form a prime number pair if:

- 1 <= x <= y <= n
- x + y == n
- x and y are prime numbers

Return the 2D sorted list of prime number pairs [xi, yi]. The list should be sorted in increasing order of xi. If there are no prime number pairs at all, return an empty array.

Note: A prime number is a natural number greater than 1 with only two factors, itself and 1.

Example 1:

```
Input: n = 10
Output: [[3,7],[5,5]]
Explanation: In this example, there are two prime pairs that satisfy the criteria.
These pairs are [3,7] and [5,5], and we return them in the sorted order as described in the problem statement.
```

Example 2:

```
Input: n = 2
Output: []
Explanation: We can show that there is no prime number pair that gives a sum of 2, so we return an empty array.
```

Constraints:

- $1 <= n <= 10^6$

# 思路1 预处理所有质数

## 分析

- 预处理找到所有的质数，然后直接从第一个质数到小于`n/2+1`的最大的质数一个一个试即可

## 代码

```go
func oulerPrimes(mx int, primes *[]int) {
	flag := make([]bool, mx+1) // 标记数有没有被筛掉，false就是没有
	for i := 2; i < mx+1; i++ {
		if !flag[i] {
			// 数没有被比自己小的数筛掉，就代表是质数
			*primes = append(*primes, i)
		}
		for _, v := range *primes {
			if i*v > mx {
				break
			}
			// 每一个数都作为因子乘以比自己小的素数筛掉后面的数
			flag[i*v] = true
			if i%v == 0 {
				// 减少时间复杂度的关键算法
				// 12 = 2 * 3 * 2，i = 4时，只排了8就退出了，因为6会将12排除
				// 也就是，假设v可以整除i即i = kv，有某个数为x = mi = kmv
				//        那么存在一个数 i < km < x可以把x排掉，用i乘以所有的质数去排除就没什么意义了，提前退出减少时间复杂度
				break
			}
		}
	}
}

var allPrimes []int

func init() {
	allPrimes = make([]int, 0, 78498)
	oulerPrimes(1e6, &allPrimes)
}

func findPrimePairs(n int) [][]int {
	up := sort.Search(len(allPrimes), func(i int) bool {
		return allPrimes[i] >= n
	})
	var res [][]int
	for i := 0; i < up && allPrimes[i] < n/2+1; i++ {
		x := allPrimes[i]
		y := n - x
		j := sort.Search(up, func(i int) bool {
			return allPrimes[i] >= y
		})
		if j < up && allPrimes[j] == y {
			res = append(res, []int{x, y})
		}
	}
	return res
}
```
