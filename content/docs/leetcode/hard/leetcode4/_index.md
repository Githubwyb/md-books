---
weight: 4
title: "4. Median of Two Sorted Arrays"
---

# 题目

Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log (m+n)).

# 思路1

- 合并到同一个数组，找到第`(m+n)/2`和`(m+n+1)/2`个
- 时间复杂度 $O(m+n)$
- 空间复杂度 $O(m+n)$

# 思路2

- 用i和j分别代表两个数组移动的索引，不用合并，直接找
- 时间复杂度 $O(m+n)$
- 空间复杂度 $O(1)$

# 思路3

- 时间复杂度 $O(log(min(m, n)))$
- 空间复杂度 $O(1)$

**数学模型**

中位数的含义是将两个数组分成两个部分，两个数组的左半部分数量和与右半部分数量和相等
那么假设i和j分别将两个数组分割成左半部分和右半部分，可以得到

$$
j = \frac{(m + n)}{2} - i
$$

并且左半部分的最大值一定小于等于右半部分的最小值

$$
max(nums_{1left}, nums_{2left}) \le min(nums_{1right}, nums_{2right})
$$

按照两个数组中小的那个为准，$i$ 作为二分查找的目标值。

当 $i$ 比预期大，可以得到

$$
max(nums_{1left}, nums_{2left}) = nums_1[i] > nums_2[j] = min(nums_{1right}, nums_{2right})
$$

同理 $i$ 比预期小，可以得到

$$
max(nums_{1left}, nums_{2left}) = nums_2[j] > nums_1[i] = min(nums_{1right}, nums_{2right})
$$

**转化成代码**

使 `i = (left + right) / 2, j = (m + n) / 2 - i`
```
0 1   |    0 1 2    => left   b0 b1
i     |        j    => right  a0 a1 b2

0 1   |    0 1      => left   b0 b1
i     |        j    => right  a0 a1
```

取i和j所在位置的元素属于右半部分

- 当总数为奇数时，右半部分多一个，中位数为 $min(nums_{1r}, nums_{2r})$
- 当总数为偶数时，正好平分，中位数为 $\frac{max(nums_{1l}, nums_{2l}) + min(nums_{1r}, nums_{2r})}{2}$

并且i和j允许超出数组范围，代表所在数组都属于左半部分，可以得到

$$
\begin{aligned}
	& \because   & i &                     & \in & [0, m] \\\\
	& \therefore & j & = \frac{m+n}{2} - i & \in & [0, n]
\end{aligned}
$$

不需要考虑`j < 0 || j > n`的情况

代码如下

```go
func findMedianSortedArrays(nums1 []int, nums2 []int) float64 {
	m := len(nums1)
	n := len(nums2)
	if m > n {
		return findMedianSortedArrays(nums2, nums1)
	}

	i := 0    // value range: [0, m]
	var j int // j = (m+n+1) / 2 - i, value range: [(m-n) / 2, (m+n+1) / 2] => [0, n]
	left := 0
	right := m
	for {
		// 0, 1, 2 => 1
		// 0, 1 => 0
		i = (left + right) / 2
		// i == 0 => j = (2+3) / 2 - 0 = 2:
		// 0 1   |    0 1 2    => left   b0 b1
		// i     |        j    => right  a0 a1 b2
		j = (m + n) / 2 - i

		// m == 0 => i == 0, so (i != 0 || i != m) => m != 0
		if i != 0 && j != n && nums1[i-1] > nums2[j] {
			// i is bigger than expect, so i != 0 && j != m
			// index | 0 1 2 3 |  0 1 2 3 4
			// value | 1 3 5   |  2 4 6 8 10
			//       |       i |    j
			right = i - 1
		} else if i != m && j != 0 && nums2[j-1] > nums1[i] {
			// i is less than expect, so i != m && j != 0
			// index | 0 1 2 3 |  0 1 2 3 4
			// value | 1 3 5   |  2 4 6 8 10
			//       | i       |          j
			left = i + 1
		} else {
			// m == 0, right must be nums[j]
			// i == m, right must be nums[j]
			// j == n, right must be nums[i]
			var rightMin int
			if m == 0 || i == m || (j != n && nums1[i] > nums2[j]) {
				rightMin = nums2[j]
			} else {
				rightMin = nums1[i]
			}
			if (m+n)%2 == 1 {
				return float64(rightMin)
			}

			// m == 0, left must be nums[j-1]
			// i == 0, left must be nums[j-1]
			// j == 0, left must be nums[i-1]
			var leftMax int
			if m == 0 || i == 0 || (j != 0 && nums1[i-1] < nums2[j-1]) {
				leftMax = nums2[j-1]
			} else {
				leftMax = nums1[i-1]
			}

			return float64(leftMax+rightMin) / 2
		}
	}
}
```

# 思路4

- 时间复杂度 $O(log(m+n))$
- 空间复杂度 $O(1)$

**数学模型**

由于要求时间复杂度为O(log(m+n))，并且找中位数其实可以类似成找第K大的数
$$
K = \frac{m+n}{2}
$$
那么对K进行二分法查找，每次排除 $\frac{K}{2}$ 个数
具体思路是在两个数组中找第 $\frac{K}{2}$ 的元素
如果 $nums_1[\frac{K}{2}] > nums_2[\frac{K}{2}]$ ，说明 $nums_2[\frac{K}{2}]$ 在前K个数中，将它排掉
新的两个数组继续找 $\frac{K}{4}$

**代码实现**

```go
// s1 range [0, m]
// s2 range [0, n]
// k range [1, (m+n+1)/2]
func getKth(nums1 []int, s1 int, nums2 []int, s2 int, k int) int {
	m := len(nums1)
	n := len(nums2)

	if s1 == m {
		return nums2[s2+k-1]
	}
	if s2 == n {
		return nums1[s1+k-1]
	}
	if k == 1 {
		if nums1[s1+k-1] > nums2[s2+k-1] {
			return nums2[s2+k-1]
		}
		return nums1[s1+k-1]
	}
	index := k / 2
	var a1 int
	var a2 int
	a1 = s1 + index - 1
	if a1 >= m {
		a1 = m - 1
	}
	a2 = s2 + index - 1
	if a2 >= n {
		a2 = n - 1
	}
	if nums1[a1] > nums2[a2] {
		return getKth(nums1, s1, nums2, a2+1, k+s2-a2-1)
	} else {
		return getKth(nums1, a1+1, nums2, s2, k+s1-a1-1)
	}
}

func FindMedianSortedArrays(nums1 []int, nums2 []int) float64 {
	m := len(nums1)
	n := len(nums2)
	left := getKth(nums1, 0, nums2, 0, (m+n+1)/2)
	if (m+n)%2 == 1 {
		return float64(left)
	}

	right := getKth(nums1, 0, nums2, 0, (m+n)/2+1)
	return float64(left+right) / 2
}
```
