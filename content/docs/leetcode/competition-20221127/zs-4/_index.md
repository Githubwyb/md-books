---
weight: 2446
title: "6248. 统计中位数为 K 的子数组"
---

# 题目

给你一个长度为 n 的数组 nums ，该数组由从 1 到 n 的 不同 整数组成。另给你一个正整数 k 。

统计并返回 num 中的 中位数 等于 k 的非空子数组的数目。

注意：

数组的中位数是按 递增 顺序排列后位于 中间 的那个元素，如果数组长度为偶数，则中位数是位于中间靠 左 的那个元素。
例如，[2,3,1,4] 的中位数是 2 ，[8,4,3,5,1] 的中位数是 4 。
子数组是数组中的一个连续部分。


示例 1：

输入：nums = [3,2,1,4,5], k = 4
输出：3
解释：中位数等于 4 的子数组有：[4]、[4,5] 和 [1,4,5] 。
示例 2：

输入：nums = [2,3,1], k = 3
输出：1
解释：[3] 是唯一一个中位数等于 3 的子数组。


提示：

n == nums.length
1 <= n <= 105
1 <= nums[i], k <= n
nums 中的整数互不相同

# 思路1 统计一边大于或小于等于，然后计算另一边

## 分析

- 此题目中的中位数可以推出来
- 奇数长度下

$$左侧小于+右侧小于 = 左侧大于+右侧大于$$
$$左侧小于-左侧大于 = 右侧大于-右侧小于$$

- 偶数长度下

$$左侧小于-左侧大于+1 = 右侧大于-右侧小于$$

- 从中位数开始，向左就是大于为-1，小于为1，累加之后如果左侧和右侧相等就找到一个子数组
- 那么步骤就是先统计左边，然后去右边找有没有匹配的
- 边界情况，中位数既要算到左边也要算到右边，可以认为是以中位数为边界，向右找要算上，中位数本身也要统计向左边有几个0或-1

## 代码

```go
func countSubarrays1(nums []int, k int) int {
	// 1. 先找中位数的位置
	v := 0
	for i := range nums {
		if nums[i] == k {
			v = i
			break
		}
	}

	// 2. 向左开始进行累加，使用map进行存储
	recordMap := make(map[int]int)
	recordMap[0] = 1 // 中位数的位置本身就是0
	tmp := 0
	for i := v - 1; i >= 0; i-- {
		if nums[i] > k {
			tmp--
		} else {
			tmp++
		}
		if _, ok := recordMap[tmp]; !ok {
			recordMap[tmp] = 0
		}
		recordMap[tmp]++
	}

	// 向右开始查找
	result := 0
	tmp = 0
	for i := v; i < len(nums); i++ {
		if nums[i] > k {
			tmp++
		} else if nums[i] < k {
			tmp--
		}
		// 左侧小于-左侧大于 = 右侧大于-右侧小于
		if count, ok := recordMap[tmp]; ok {
			result += count
		}
		// 左侧小于-左侧大于+1 = 右侧大于-右侧小于
		if count, ok := recordMap[tmp-1]; ok {
			result += count
		}
	}
	return result
}
```

# 思路2 简化成一次遍历

## 分析

- 还是上面的思路，最左侧其实等于 $\sum 左侧小于 - \sum 左侧大于$
- 整体统计数据加上 $\sum 左侧大于 - \sum 左侧小于$，那么最左边的就是0，第二个就是大于加一，小于减一，和右边计算是一致的
- 只需要考虑边界情况，将中位数计算到两边即可，那么一次遍历就解决了问题
- 第一位是按照0开始计算的，所以每个i都是在算i+1的结果，所以左边的遍历只需要到k所在位置前一个就好

## 代码

```go
func countSubarrays(nums []int, k int) int {
	result := 0
	v := len(nums)
	tmp := 0
	recordMap := make(map[int]int)
	recordMap[0] = 1 // 第一位是0
	for i := range nums {
		if nums[i] > k {
			tmp++
		} else if nums[i] < k {
			tmp--
		} else {
			v = i
		}
		// 每个i计算的都是下一位的值，所以不需要到中位数所在的位置
		if i < v {
			if _, ok := recordMap[tmp]; !ok {
				recordMap[tmp] = 0
			}
			recordMap[tmp]++
		} else {
			if count, ok := recordMap[tmp]; ok {
				result += count
			}
			if count, ok := recordMap[tmp-1]; ok {
				result += count
			}
		}
	}
	return result
}
```
