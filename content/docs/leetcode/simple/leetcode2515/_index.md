---
weight: 2515
title: "2515. Shortest Distance to Target String in a Circular Array"
---

# 题目

You are given a 0-indexed circular string array words and a string target. A circular array means that the array's end connects to the array's beginning.

- Formally, the next element of words[i] is words[(i + 1) % n] and the previous element of words[i] is words[(i - 1 + n) % n], where n is the length of words.

Starting from startIndex, you can move to either the next word or the previous word with 1 step at a time.

Return the shortest distance needed to reach the string target. If the string target does not exist in words, return -1.

Example 1:

```
Input: words = ["hello","i","am","leetcode","hello"], target = "hello", startIndex = 1
Output: 1
Explanation: We start from index 1 and can reach "hello" by
- moving 3 units to the right to reach index 4.
- moving 2 units to the left to reach index 4.
- moving 4 units to the right to reach index 0.
- moving 1 unit to the left to reach index 0.
The shortest distance to reach "hello" is 1.
```

Example 2:

```
Input: words = ["a","b","leetcode"], target = "leetcode", startIndex = 0
Output: 1
Explanation: We start from index 0 and can reach "leetcode" by
- moving 2 units to the right to reach index 3.
- moving 1 unit to the left to reach index 3.
The shortest distance to reach "leetcode" is 1.
```

Example 3:

```
Input: words = ["i","eat","leetcode"], target = "ate", startIndex = 0
Output: -1
Explanation: Since "ate" does not exist in words, we return -1.
```

Constraints:

- 1 <= words.length <= 100
- 1 <= words[i].length <= 100
- words[i] and target consist of only lowercase English letters.
- 0 <= startIndex < words.length

# 思路1

## 分析

- 按照题目找，从起点开始，左右开工，找到相同的就返回

## 代码

```go
func closetTarget(words []string, target string, startIndex int) int {
	if words[startIndex] == target {
		return 0
	}
	l, r := startIndex, startIndex
	n := 0
	for {
		l--
		if l < 0 {
			l = len(words) - 1
		}
		r++
		if r == len(words) {
			r = 0
		}
		n++
		if words[l] == target || words[r] == target {
			return n
		}
		if r == l {
			return -1
		}
	}
}
```

# 思路2

## 分析

- 遍历一遍，找正向和反向最小的
- 时间复杂度比上面高点，不过还是`O(n)`

## 代码

```go
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func min(a, b int) int {
	if a > b {
		return b
	}
	return a
}

func closetTarget1(words []string, target string, startIndex int) int {
	result := math.MaxInt
	for i := range words {
		if words[i] != target {
			continue
		}
		d := abs(startIndex - i)
		d = min(d, len(words)-d)
		result = min(result, d)
	}
	if result == math.MaxInt {
		return -1
	}
	return result
}
```
