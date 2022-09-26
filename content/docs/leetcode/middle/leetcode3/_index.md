---
weight: 3
title: "- 3. Longest Substring Without Repeating Characters"
---

# 题目

Given a string s, find the length of the longest substring without repeating characters.

# 思路1

- 暴力遍历，每个子字符串都判断是否没有重复字符串

# 思路2

- 两个指针，i和j，j代表右侧，i代表左侧
- j向后遍历，判断i和j之间是否有和j对应字符相同的
- 如果有，计算长度，i移到相同的字符后面
- 使用hashMap进行判断

```go
func LengthOfLongestSubstring(s string) (result int) {
	hashMap := make(map[byte]int)
	for i, v := range s {
		i1, ok := hashMap[byte(v)]
		if !ok {
			hashMap[byte(v)] = i
			continue
		}
		if result < len(hashMap) {
			result = len(hashMap)
		}
		hashMap[byte(v)] = i
	}
	if result < len(hashMap) {
		result = len(hashMap)
	}

	return
}
```

# 思路3

- 在思路2的基础上，将hashMap换成数组，128位
- 由于初始化为0，我们使用`index+1`来作为value

```go
func LengthOfLongestSubstring(s string) (result int) {
	var charMap [128]int
	i := 0
	for j, v := range s {
		index := charMap[byte(v)]
		if index > i {
			// 0 1 2 3
			// a b c a
			// i     j
			length := j - i
			if result < length {
				result = length
			}
			i = index
		}
		charMap[byte(v)] = j + 1
	}
	// 0 1 2 3
	// a b c d
	// i
	length := len(s) - i
	if result < length {
		result = length
	}

	return
}
```

# 思路4

- 在思路3的基础上，最后一段怎么看都不爽
- 在j移动过程中动态计算长度，不用在遍历完再来判断一遍

```go
func LengthOfLongestSubstring(s string) (result int) {
	var charMap [128]int
	i := 0
	for j, v := range s {
		index := charMap[byte(v)]
		// 0 1 2 3 4
		// a b c b d
		// i     j
		// index = 2
		if i < index {
			i = index
		}
		length := j - i + 1
		if result < length {
			result = length
		}
		charMap[byte(v)] = j + 1
	}

	return
}
```
