---
weight: 2443
title: "2443. Sum of Number and Its Reverse"
---

# 题目

Given a non-negative integer num, return true if num can be expressed as the sum of any non-negative integer and its reverse, or false otherwise.

Example 1:

```
Input: num = 443
Output: true
Explanation: 172 + 271 = 443 so we return true.
```

Example 2:

```
Input: num = 63
Output: false
Explanation: 63 cannot be expressed as the sum of a non-negative integer and its reverse so we return false.
```

Example 3:

```
Input: num = 181
Output: true
Explanation: 140 + 041 = 181 so we return true. Note that when a number is reversed, there may be leading zeros.
```

Constraints:

- $0 <= num <= 10^5$

# 思路1 暴力破解遍历

## 分析

- 时间复杂度大致为 $O(n)$
- 暴力，但是带一点分析。如果大于n/2的数，翻转小于自己的，都遍历过了，除非是末尾是0
- 所以对于大于n/2的只用判断是不是整十就好了

## 代码实现

```go
func reverse(num int) int {
	result := 0
	for ; num != 0; num /= 10 {
		result *= 10
		result += num % 10
	}
	return result
}

func sumOfNumberAndReverse(num int) bool {
	for i := 0; i <= num; i++ {
		if i > num/2 && i%10 != 0 {
			continue
		}
		if i+reverse(i) == num {
			return true
		}
	}
	return false
}
```

# 思路2 双指针

## 分析

- 时间复杂度只和num的位数有关，空间复杂度同样
- 一个数加上它的取反，假设没有进位，可以得到一个中心对称的数字。就算进行进位，也最多进位一位
- 那么我们就从左右两个点开始向内收缩，查看是否可以找到一个数加上翻转自身得到
- 分两种情况
  - 进位，那么低位和高位之间相差1
  - 没进位，地位和高位一样
- 考虑最高位的情况，如果是1，可能是进位的，也可能是本身加出来的，这两种情况分别计算一下取或即可
- 取pre为左侧前一位是否有进位，suf为右侧是否给后一位进了位，可以得到
  - pre存在进位，那么下一轮的suf就存在进位
  - pre的值取决于左右两个位是否相差1
- 考虑边界情况
  - 如果左侧第一个为1（不考虑1是被进位的情况），右侧最后一位不能为0，否则就会出现`100 => 050 + 050`的情况
  - 如果左侧存在进位，那么两个数最大加出来只能到18
  - 如果存在进位，那么两个数加起来加上进位最小不可能到0，最大可以到19
  - 如果不存在进位，两个数加起来最大到18，最小到0
  - 如果左右都符合，到中间一位（181），因为中间的数是自己加自己，那么必须是复数
  - 如果没有正中间一位（2321 = 1660 + 0661），遍历到最后，l指向中间偏右一个，r指向中间偏左一个，那么pre和suf应该相等

## 代码

```go
// s数字的字符串形式
// l，r 左右指针
// pre 左侧是否被进位的标识
func existReverseSum(s string, l, r int, pre int) bool {
	// 左侧第一个为1，不考虑进位的情况，右侧必须为1，否则就是 100 = 050 + 050的情况
	if l == 0 && s[l] == '1' && s[r] == '0' {
		return false
	}
	suf := 0 // 右侧是否进位的标识
	for l < r {
		checkLeft := int(s[l] - '0')
		checkRight := int(s[r] - '0')
		l++
		r--

		// 存在进位，右侧最小到1
		if suf == 1 && checkRight == 0 {
			return false
		}
		// 本身要进位，两数相加最多到18，也就是右侧不可能为9（存在进位上面判断过不可能为0，那么就是不存在进位不可能为9）
		if pre == 1 && suf == 0 && checkRight == 9 {
			return false
		}

		if checkLeft == checkRight-suf {
			// 如果左侧存在进位，那么两个数最大加出来只能到18
			suf = pre
			pre = 0
		} else if checkLeft-1+suf == checkRight {
			suf = pre
			pre = 1
		} else {
			return false
		}
	}
	if l == r && (int(s[l]-'0')-suf)%2 == 1 {
		// 13121 中间剩个奇数，就找不到
		return false
	} else if l != r && suf != pre {
		// 21 剩余一个suf没人认领
		return false
	}
	return true
}

func sumOfNumberAndReverse1(num int) bool {
	s := fmt.Sprint(num)
	n := len(s)

	return existReverseSum(s, 0, n-1, 0) || (s[0] == '1' && n > 1 && existReverseSum(s, 1, n-1, 1))
}
```
