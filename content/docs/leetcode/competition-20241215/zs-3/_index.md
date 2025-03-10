---
weight: 3388
title: "3388. Count Beautiful Splits in an Array"
---

# 题目

You are given an array nums.

A split of an array nums is beautiful if:

1. The array nums is split into three non-empty subarrays: nums1, nums2, and nums3, such that nums can be formed by concatenating nums1, nums2, and nums3 in that order.
2. The subarray nums1 is a prefix of nums2 OR nums2 is a prefix of nums3.

Return the number of ways you can make this split.

A subarray is a contiguous non-empty sequence of elements within an array.

A prefix of an array is a subarray that starts from the beginning of the array and extends to any point within it.

Example 1:

```
Input: nums = [1,1,2,1]

Output: 2

Explanation:

The beautiful splits are:

1. A split with nums1 = [1], nums2 = [1,2], nums3 = [1].
2. A split with nums1 = [1], nums2 = [1], nums3 = [2,1].
```

Example 2:

```
Input: nums = [1,2,3,4]

Output: 0

Explanation:

There are 0 beautiful splits.
```

Constraints:

- 1 <= nums.length <= 5000
- 0 <= nums[i] <= 50

# 思路1 z函数求前缀数组

## 分析

直接暴力遍历，第一个分割是i，第二个分割是j

- 对于nums1是nums2的前缀的情况，求出nums的z函数，就有len(nums1) <= len(nums2) && z[i] >= len(nums1)
- 对于nums2是nums3的前缀的情况，求出nums[i]的z函数，就有len(nums2) <= len(nums3) && z0[j-i] >= len(nums2)

## 代码

```go
func z_func(nums []int) []int {
    n := len(nums)
    z := make([]int, n)
    zl, zr := 0, 0
    for i := 1; i < n; i++ {
        if i < zr && z[i-zl] < zr-i {
            // z[i-l]对应的数组没有超出zbox
            z[i] = z[i-zl]
            continue
        }
        // i超出zbox，或长度超出zbox重新算
        if i < zr {
            // i在zbox中，从zr开始找，计算少一点
            z[i] = zr - i
        } else {
            // i不在zbox中，从i开始找zr
            zr = i
        }
        for ; zr < n && nums[z[i]] == nums[zr]; zl, zr, z[i] = i, zr+1, z[i]+1 {
        }
    }
    return z
}

func beautifulSplits(nums []int) int {
    n := len(nums)
    z := z_func(nums)
    res := 0
    for i := 1; i < n-1; i++ {
        z0 := z_func(nums[i:])
        for j := i + 1; j < n; j++ {
            // nums1是nums2的前缀，len(nums1) <= len(nums2) && z[i] >= len(nums1)
            // nums2是nums3的前缀，len(nums2) <= len(nums3) && z0[j-i] >= len(nums2)
            if i <= j-i && z[i] >= i {
                res++
            } else if j-i <= n-j {
                if z0[j-i] >= j-i {
                    res++
                }
            }
        }
    }
    return res
}
```

时间复杂度，z函数是 $O(n)$，两个遍历是 $O(n^2)$ ，整体就是 $O(n^2)$，空间复杂度 $O(n)$

# 思路2 lcp直接暴力计算

## 分析

同上直接暴力遍历，第一个分割是i，第二个分割是j，先求出整个数组的lcp数组

- 对于nums1是nums2的前缀的情况，就有len(nums1) <= len(nums2) && lcp[nums1][nums2] >= len(nums1)
- 对于nums2是nums3的前缀的情况，就有len(nums2) <= len(nums3) && lcp[nums2][nums3] >= len(nums2)

## 代码

```go
func beautifulSplits1(nums []int) int {
    n := len(nums)
    // 多一个，最后一个越界的n是0，不影响计算
    lcp := make([][]int, n+1)
    for i := range lcp {
        lcp[i] = make([]int, n+1)
    }
    for i := n - 1; i >= 0; i-- {
        for j := n - 1; j > i; j-- {
            if nums[i] == nums[j] {
                lcp[i][j] = lcp[i+1][j+1] + 1
            }
        }
    }

    res := 0
    for i := 1; i < n-1; i++ {
        for j := i + 1; j < n; j++ {
            // nums1是nums2的前缀，len(nums1) <= len(nums2) && lcp[nums1][nums2] >= len(nums1)
            // nums2是nums3的前缀，len(nums2) <= len(nums3) && lcp[nums2][nums3] >= len(nums2)
            if (i <= j-i && lcp[0][i] >= i) || (j-i <= n-j && lcp[i][j] >= j-i) {
                res++
            }
        }
    }

    return res
}
```

时间复杂度和上面一样 $O(n^2)$，空间复杂度 $O(n^2)$
