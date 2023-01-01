---
weight: 6280
title: "6280. Closest Prime Numbers in Range"
---

# 题目

Given two positive integers left and right, find the two integers num1 and num2 such that:

- left <= nums1 < nums2 <= right .
- nums1 and nums2 are both prime numbers.
- nums2 - nums1 is the minimum amongst all other pairs satisfying the above conditions.

Return the positive integer array ans = [nums1, nums2]. If there are multiple pairs satisfying these conditions, return the one with the minimum nums1 value or [-1, -1] if such numbers do not exist.

A number greater than 1 is called prime if it is only divisible by 1 and itself.

Example 1:

```
Input: left = 10, right = 19
Output: [11,13]
Explanation: The prime numbers between 10 and 19 are 11, 13, 17, and 19.
The closest gap between any pair is 2, which can be achieved by [11,13] or [17,19].
Since 11 is smaller than 17, we return the first pair.
```

Example 2:

```
Input: left = 4, right = 6
Output: [-1,-1]
Explanation: There exists only one prime number in the given range, so the conditions cannot be satisfied.
```

Constraints:

- $1 <= left <= right <= 10^6$

# 思路1 查找质数+状态机

## 分析

- 自己想的，从left到right，每个数都试试是不是质数，是质数就放到状态机计算
- 因为时间复杂度太高，优化了一下，因为质数最小差是2和3之间差1，后面基本最小都是相差2，那么找到相差小于等于2就可以直接返回了，后面不可能比此数更小了

## 代码

```go
func isPrime(num int) bool {
	if num <= 1 {
		return false
	}
	target := int(math.Sqrt(float64(num))) + 1
	for i := 2; i < target; i++ {
		if num%i == 0 {
			return false
		}
	}
	return true
}

func closestPrimes(left int, right int) []int {
	state := 0
	p, n := 0, 0
	result := []int{-1, -1}
	min := math.MaxInt
	for i := left; i <= right; i++ {
		if !isPrime(i) {
			continue
		}
		switch state {
		case 0:
			// 未找到第一个质数
			state = 1
			p = i
		case 1:
			// 找到第一个质数，未找到第二个
			state = 2
			n = i
			result[0], result[1] = p, n
			min = n - p
		case 2:
			// 两个都找到了，找个最小的
			p, n = n, i
			if min > n-p {
				result[0], result[1] = p, n
				min = n - p
			}
		}
		if min <= 2 {
			return result
		}
	}
	return result
}
```

# 思路2 欧拉线性筛+状态机

## 分析

- 第一的想法，不过没我快
- 虽然使用了欧拉线性筛来减少时间复杂度，不过整体测起来还没上面的方法更快
- 使用上述的状态机加上提前退出嵌入到欧拉线性筛中，也没上面的快

## 代码

```go
func closestPrimes1(left int, right int) []int {
	min := math.MaxInt
	result := []int{-1, -1}
	flag := make([]bool, right+1)
	primeNums := []int{}
	p, n := 0, 0
	state := 0
	for i := 2; i <= right; i++ {
		if !flag[i] {
			primeNums = append(primeNums, i)
			if i >= left {
				switch state {
				case 0:
					p = i
					state = 1
				case 1:
					n = i
					result[0], result[1] = p, n
					min = n - p
					state = 2
				case 2:
					p, n = n, i
					if n-p < min {
						result[0], result[1] = p, n
						min = n - p
					}
				}
				if min <= 2 {
					return result
				}
			}
		}

		for _, p := range primeNums {
			if i*p > right {
				break
			}
			flag[i*p] = true
			if i%p == 0 {
				break
			}
		}
	}
	return result
}
```
