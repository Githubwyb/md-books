---
weight: 2399
title: "2399. Check Distances Between Same Letters"
---

# 题目

You are given a 0-indexed string s consisting of only lowercase English letters, where each letter in s appears exactly twice. You are also given a 0-indexed integer array distance of length 26.

Each letter in the alphabet is numbered from 0 to 25 (i.e. 'a' -> 0, 'b' -> 1, 'c' -> 2, ... , 'z' -> 25).

In a well-spaced string, the number of letters between the two occurrences of the ith letter is `distance[i]`. If the ith letter does not appear in s, then `distance[i]` can be ignored.

Return true if s is a well-spaced string, otherwise return false.

# 思路1

## 分析

- 最简单的使用数组当map存一下上次的位置，然后遍历一遍搞定

## 代码实现

```go
func checkDistances(s string, distance []int) bool {
	// 使用数组作为map存储，0到128
	showMap := make([]int, 128)
	for i := range showMap {
		showMap[i] = -1
	}
	for i := range s {
		index := s[i]-'a'
		if showMap[index] == -1 {
			showMap[index] = i
			continue
		}

		d := i-showMap[index]-1
		if distance[index] != d {
			return false
		}
	}
	return true
}
```
