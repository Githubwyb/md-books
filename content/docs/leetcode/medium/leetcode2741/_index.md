---
weight: 2741
title: "2741. Special Permutations"
---

# 题目

You are given a 0-indexed integer array nums containing n distinct positive integers. A permutation of nums is called special if:

- For all indexes 0 <= i < n - 1, either nums[i] % nums[i+1] == 0 or nums[i+1] % nums[i] == 0.

Return the total number of special permutations. As the answer could be large, return it modulo $10^9 + 7$.

Example 1:

```
Input: nums = [2,3,6]
Output: 2
Explanation: [3,6,2] and [2,6,3] are the two special permutations of nums.
```

Example 2:

```
Input: nums = [1,4,3]
Output: 2
Explanation: [3,1,4] and [4,1,3] are the two special permutations of nums.
```

Constraints:

- 2 <= nums.length <= 14
- $1 <= nums[i] <= 10^9$

# 思路1 dp递推

## 分析

- 一位一位数放，将某个数是否出现过记录在二进制数中
- 记录上一位出现的数字，枚举下一位可以出现什么数字，记录的是第i位是x的某个状态的数量

## 代码

```go
func specialPerm1(nums []int) int {
	var mod int = 1e9 + 7
	n := len(nums)
	// 第一维是上一位是什么数字，第二维是状态（保存什么数字出现过的二进制），value为数量
	stMap := map[int]map[uint16]int{}
	for i, v := range nums {
		stMap[v] = map[uint16]int{
			1 << i: 1,
		}
	}
	for i := 1; i < n; i++ {
		tmp := stMap
		stMap = make(map[int]map[uint16]int)
		// 遍历map，找state中没出现过的数字，看能否填到此位，能填就加上数量
		for l, vMap := range tmp {
			// 遍历所有的状态，然后遍历所有的nums，没出现过且可以放就放进去
			for j, v := range nums {
				for st, c := range vMap {
					// 出现过或不能放到下一位就跳过
					if st&(1<<j) > 0 || (v%l != 0 && l%v != 0) {
						continue
					}
					if stMap[v] == nil {
						stMap[v] = make(map[uint16]int)
					}
					st |= (1 << j)
					stMap[v][st] = (stMap[v][st] + c) % mod
				}
			}
		}
	}
	res := 0
	for _, c := range stMap {
		for _, c1 := range c {
			res = (res + c1) % mod
		}
	}
	return res
}
```

# 思路2 优化时间复杂度

## 分析

- 在上一步的基础上，发现每次要遍历所有的数，如果提前把某个数下一个数能选啥给找出来可以遍历少一点

## 代码

```go
func specialPerm(nums []int) int {
	var mod int = 1e9 + 7
	// 先找出谁能和谁做邻居
	// key为数字值，v为index
	pMap := map[int][]int{}
	n := len(nums)
	for i, v := range nums {
		for j := i + 1; j < n; j++ {
			v1 := nums[j]
			if v%v1 == 0 || v1%v == 0 {
				pMap[v] = append(pMap[v], j)
				pMap[v1] = append(pMap[v1], i)
			}
		}
	}
	stMap := map[int]map[uint16]int{}
	for i, v := range nums {
		stMap[v] = map[uint16]int{
			1 << i: 1,
		}
	}
	for range nums[:n-1] {
		tmp := stMap
		stMap = make(map[int]map[uint16]int)
		// 遍历map，找state中没出现过的数字，看能否填到此位，能填就加上数量
		for k, v := range tmp {
			for _, v1 := range pMap[k] {
				for st, c := range v {
					if st&(1<<v1) > 0 {
						continue
					}
					st |= 1 << v1
					if stMap[nums[v1]] == nil {
						stMap[nums[v1]] = make(map[uint16]int)
					}
					stMap[nums[v1]][st] = (stMap[nums[v1]][st] + c) % mod
				}
			}
		}
	}
	res := 0
	for _, c := range stMap {
		for _, c1 := range c {
			res = (res + c1) % mod
		}
	}
	return res
}
```
