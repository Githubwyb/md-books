---
weight: 2531
title: "2531. Make Number of Distinct Characters Equal"
---

# 题目

You are given two 0-indexed strings word1 and word2.

A move consists of choosing two indices i and j such that 0 <= i < word1.length and 0 <= j < word2.length and swapping word1[i] with word2[j].

Return true if it is possible to get the number of distinct characters in word1 and word2 to be equal with exactly one move. Return false otherwise.

Example 1:

```
Input: word1 = "ac", word2 = "b"
Output: false
Explanation: Any pair of swaps would yield two distinct characters in the first string, and one in the second string.
```

Example 2:

```
Input: word1 = "abcc", word2 = "aab"
Output: true
Explanation: We swap index 2 of the first string with index 0 of the second string. The resulting strings are word1 = "abac" and word2 = "cab", which both have 3 distinct characters.
```

Example 3:

```
Input: word1 = "abcde", word2 = "fghij"
Output: true
Explanation: Both resulting strings will have 5 distinct characters, regardless of which indices we swap.
```

Constraints:

- $1 <= word1.length, word2.length <= 10^5$
- word1 and word2 consist of only lowercase English letters.

# 思路1 统计加各种情况枚举

## 分析

- 自己想得，其实想复杂了，具体看注释吧

## 代码

```go
func abs(a int) int {
	if a < 0 {
		return -a
	}
	return a
}

func isItPossible(word1 string, word2 string) bool {
	set1 := make(map[byte]int)
	set2 := make(map[byte]int)
	for _, t := range word1 {
		v := byte(t)
		if set1[v] > 0 {
			set1[v]++
		} else {
			set1[v] = 1
		}
	}
	for _, t := range word2 {
		v := byte(t)
		if set2[v] > 0 {
			set2[v]++
		} else {
			set2[v] = 1
		}
	}

	// 两个字符串中不同字符个数相等直接返回成功
	diff := abs(len(set1) - len(set2))
	more, less := set1, set2
	if len(set1) < len(set2) {
		more, less = set2, set1
	}
	if diff == 0 {
		// 多不变少不变，多的和少的有相同的
		//			    多的和少的各有一个只有一个但对方没有的
		// 多加少加		多的和少的各有一个有两个的
		for k := range more {
			if less[k] > 0 {
				return true
			}
			if more[k] >= 2 {
				for k1 := range less {
					if less[k1] >= 2 {
						return true
					}
				}
			} else if more[k] == 1 && less[k] == 0 {
				for k1 := range less {
					if less[k1] == 1 && more[k1] == 0 {
						return true
					}
				}
			}
		}
		return false
	}
	if diff == 1 {
		// 多减少不变，多的要替换的只有1个的并且替换来的是替换后已经有的
		//			  少的要替换的是有2个的并且替换来的是已经有的
		// 多减少动了一下还是没变，多的要替换的只有1个的并且替换来的是替换后已经有的
		//						 少的要替换的是有1个的并且替换来的是少的没有的
		// 多不变少加，多的要替换的是有2个的并且替换来的是已经有的
		// 			  少的要替换的是有2个的并且替换来的是没有的
		// 多变了一下但还是没变少加，多的要替换的是只有1个的并且是少的没有的，少的替换过来的是有两个的也是多的没有的
		for k := range less {
			if less[k] >= 2 && more[k] > 0 {
				for k1 := range more {
					if more[k1] == 1 && less[k1] > 0 && k1 != k {
						return true
					}
					if more[k1] >= 2 && less[k1] == 0 {
						return true
					}
				}
			}
			if less[k] >= 2 && more[k] == 0 {
				for k1 := range more {
					if more[k1] == 1 && less[k1] == 0 {
						return true
					}
				}
			}
			if less[k] == 1 && more[k] > 0 {
				for k1 := range more {
					if k != k1 && more[k1] == 1 && less[k1] == 0 {
						return true
					}
				}
			}
		}
		return false
	}
	if diff == 2 {
		// 多减少加，多的要替换的是只有1个的并且替换来的是替换后已经有的
		// 			少的要替换的是有2个的并且替换来的是没有的
		for k := range more {
			if more[k] == 1 && less[k] == 0 {
				for k1 := range less {
					if less[k1] >= 2 && more[k1] > 0 && k1 != k {
						return true
					}
				}
			}
		}
		return false
	}
	return false
}
```

# 思路2 和上面思路一样，只不过换了遍历方式

## 分析

- 第一步统计少不了
- 第二步判断是否不可行也少不了
- 第三步遍历所有的交换可能，有一种满足就返回

## 代码

```go
func isItPossible1(word1 string, word2 string) bool {
	set1 := make(map[rune]int)
	set2 := make(map[rune]int)
	for _, t := range word1 {
		set1[t]++
	}
	for _, t := range word2 {
		set2[t]++
	}

	diff := len(set1) - len(set2)
	if diff > 2 || diff < -2 {
		return false
	}

	getInt := func(x bool) int {
		if x {
			return 1
		}
		return 0
	}

	for k1, c1 := range set1 {
		for k2, c2 := range set2 {
			if k1 == k2 {
				// 相等，交换不改变，那么长度差为0就可以
				if diff == 0 {
					return true
				}
			} else {
				// 不相等，交换会变化，变化后相等即可
				// 当前长度 - k1是否唯一 + k2是否存在
				if (len(set1) - getInt(c1 == 1) + getInt(set1[k2] == 0)) == (len(set2) - getInt(c2 == 1) + getInt(set2[k1] == 0)) {
					return true
				}
			}
		}
	}
	return false
}
```
