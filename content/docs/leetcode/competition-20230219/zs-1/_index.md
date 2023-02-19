---
weight: 6362
title: "6362. Merge Two 2D Arrays by Summing Values"
---

# 题目

You are given two 2D integer arrays nums1 and nums2.

- nums1[i] = [idi, vali] indicate that the number with the id idi has a value equal to vali.
- nums2[i] = [idi, vali] indicate that the number with the id idi has a value equal to vali.

Each array contains unique ids and is sorted in ascending order by id.

Merge the two arrays into one array that is sorted in ascending order by id, respecting the following conditions:

- Only ids that appear in at least one of the two arrays should be included in the resulting array.
- Each id should be included only once and its value should be the sum of the values of this id in the two arrays. If the id does not exist in one of the two arrays then its value in that array is considered to be 0.

Return the resulting array. The returned array must be sorted in ascending order by id.

Example 1:

```
Input: nums1 = [[1,2],[2,3],[4,5]], nums2 = [[1,4],[3,2],[4,1]]
Output: [[1,6],[2,3],[3,2],[4,6]]
Explanation: The resulting array contains the following:
- id = 1, the value of this id is 2 + 4 = 6.
- id = 2, the value of this id is 3.
- id = 3, the value of this id is 2.
- id = 4, the value of this id is 5 + 1 = 6.
```

Example 2:

```
Input: nums1 = [[2,4],[3,6],[5,5]], nums2 = [[1,3],[4,3]]
Output: [[1,3],[2,4],[3,6],[4,3],[5,5]]
Explanation: There are no common ids, so we just include each id with its value in the resulting list.
```

Constraints:

- 1 <= nums1.length, nums2.length <= 200
- nums1[i].length == nums2[j].length == 2
- 1 <= idi, vali <= 1000
- Both arrays contain unique ids.
- Both arrays are in strictly ascending order by id.

# 思路1 归并方法合并两个数组

## 分析

- 直接合并两个数组

## 代码

```go
func mergeArrays(nums1 [][]int, nums2 [][]int) [][]int {
	i, j := 0, 0
	n1, n2 := len(nums1), len(nums2)
	result := make([][]int, 0, n1+n2)
	for i != n1 && j != n2 {
		id1, v1, id2, v2 := nums1[i][0], nums1[i][1], nums2[j][0], nums2[j][1]
		if id1 == id2 {
			result = append(result, []int{id1, v1 + v2})
			i++
			j++
		} else if id1 < id2 {
			result = append(result, nums1[i])
			i++
		} else {
			result = append(result, nums2[j])
			j++
		}
	}
	for ; i < n1; i++ {
		result = append(result, nums1[i])
		i++
	}
	for ; j < n2; j++ {
		result = append(result, nums2[j])
	}
	return result
}
```

# 思路2 存map，然后排序

## 分析

- 可以直接用红黑树存，不用排序
- 不过go里面的map是hash，还是随机的
- 这种方法其实没上面好，但是实现简单

## 代码

```go
type IntsSlice [][]int

func (x IntsSlice) Len() int { return len(x) }

// 为true，i向前；false，j向前。要满足相等时返回false
func (x IntsSlice) Less(i, j int) bool { return x[i][0] < x[j][0] }
func (x IntsSlice) Swap(i, j int) {
	x[i], x[j] = x[j], x[i]
}

func mergeArrays1(nums1 [][]int, nums2 [][]int) [][]int {
	intMap := make(map[int]int)
	for _, v := range nums1 {
		intMap[v[0]] += v[1]
	}
	for _, v := range nums2 {
		intMap[v[0]] += v[1]
	}
	result := make(IntsSlice, 0, len(intMap))
	for k, v := range intMap {
		result = append(result, []int{k, v})
	}
	sort.Sort(result)
	return result
}
```
