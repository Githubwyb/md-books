---
weight: 3398
title: "3398. Smallest Substring With Identical Characters II"
---

# 题目

You are given a binary string s of length n and an integer numOps.

You are allowed to perform the following operation on s at most numOps times:

- Select any index i (where 0 <= i < n) and flip s[i], i.e., if s[i] == '1', change s[i] to '0' and vice versa.

You need to minimize the length of the longest substring of s such that all the characters in the substring are identical.

Return the minimum length after the operations.

A substring is a contiguous non-empty sequence of characters within a string.

Example 1:

```
Input: s = "000001", numOps = 1

Output: 2

Explanation:

By changing s[2] to '1', s becomes "001001". The longest substrings with identical characters are s[0..1] and s[3..4].
```

Example 2:

```
Input: s = "0000", numOps = 2

Output: 1

Explanation:

By changing s[0] and s[2] to '1', s becomes "1010".
```

Example 3:

```
Input: s = "0101", numOps = 0

Output: 1
```

Constraints:

- 1 <= n == s.length <= 1000
- s consists only of '0' and '1'.
- 0 <= numOps <= n

# 思路1 二分法求结果

## 分析



## 代码

```go
func minLength(s string, numOps int) int {
	n := len(s)
	// 二分法查找结果
	ans := sort.Search(n, func(mx int) bool {
		if mx == 0 {
			return false
		}
		cnt := 0
		if mx == 1 {
			// 最大为1的情况下，取1开头和0开头最小值
			for i, v := range s {
				if int(v&1) != i&1 {
					cnt++
				}
			}
			cnt = min(cnt, n-cnt)
		} else {
			for i := 0; i < n; {
				// 查找连续字串，分割为mx+1的次数
				st := i
				for i++; i < n && s[i] == s[i-1]; i++ {
				}
				l := i - st
				cnt += l / (mx + 1)
			}
		}
		return cnt <= numOps
	})
	return ans
}
```
