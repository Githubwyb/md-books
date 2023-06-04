---
weight: 2601
title: "2601. Prime Subtraction Operation"
---

# 题目

You are given a 0-indexed integer array nums of length n.

You can perform the following operation as many times as you want:

- Pick an index i that you haven’t picked before, and pick a prime p strictly less than nums[i], then subtract p from nums[i].

Return true if you can make nums a strictly increasing array using the above operation and false otherwise.

A strictly increasing array is an array whose each element is strictly greater than its preceding element.

Example 1:

```
Input: nums = [4,9,6,10]
Output: true
Explanation: In the first operation: Pick i = 0 and p = 3, and then subtract 3 from nums[0], so that nums becomes [1,9,6,10].
In the second operation: i = 1, p = 7, subtract 7 from nums[1], so nums becomes equal to [1,2,6,10].
After the second operation, nums is sorted in strictly increasing order, so the answer is true.
```

Example 2:

```
Input: nums = [6,8,11,12]
Output: true
Explanation: Initially nums is sorted in strictly increasing order, so we don't need to make any operations.
```

Example 3:

```
Input: nums = [5,8,3]
Output: false
Explanation: It can be proven that there is no way to perform operations to make nums sorted in strictly increasing order, so the answer is false.
```

Constraints:

- 1 <= nums.length <= 1000
- 1 <= nums[i] <= 1000
- nums.length == n

# 思路1 筛质数+二分

## 分析

- 1000以内的质数全部先找出来
- 每个数都尽可能小就好了，那么就是找质数里面小于当前到前一个差值的最大的那个

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

var primes []int = make([]int, 0, 168)

func init() {
	oulerPrimes(1000, &primes)
}

func primeSubOperation1(nums []int) bool {
	pre := 0
	for _, v := range nums {
		// 每个数都尽可能小
		if v <= pre {
			return false
		}
		// 找到能尽可能接近pre的最大质数，反过来就是找v-pre之间的最大质数
		i := sort.SearchInts(primes, v-pre) - 1
		if i < 0 {
			pre = v
		} else {
			pre = v - primes[i]
		}
	}
	return true
}
```

# 思路2 倒着做

## 分析

- 和上面一样，只是上面不好理解，倒着好理解，没上面写的快
- 尽可能让每一个数减去质数后小于但最接近后一个

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

var primes []int = make([]int, 0, 168)

func init() {
	oulerPrimes(1000, &primes)
}

func primeSubOperation(nums []int) bool {
	n := len(nums)
	last := nums[n-1]
	for i := n - 2; i >= 0; i-- {
		v := nums[i]
		if v < last {
			last = v
			continue
		}
		for _, vp := range primes {
			if vp >= v {
				return false
			}
			if v-vp < last {
				v -= vp
				break
			}
		}
		if v >= last {
			return false
		}
		last = v
		continue
	}
	return true
}
```