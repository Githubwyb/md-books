---
weight: 13
title: "13. Roman to Integer"
---

# 题目

Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M.

```
Symbol       Value
I             1
V             5
X             10
L             50
C             100
D             500
M             1000
```

For example, 2 is written as II in Roman numeral, just two one's added together. 12 is written as XII, which is simply X + II. The number 27 is written as XXVII, which is XX + V + II.

Roman numerals are usually written largest to smallest from left to right. However, the numeral for four is not IIII. Instead, the number four is written as IV. Because the one is before the five we subtract it making four. The same principle applies to the number nine, which is written as IX. There are six instances where subtraction is used:

- I can be placed before V (5) and X (10) to make 4 and 9.
- X can be placed before L (50) and C (100) to make 40 and 90.
- C can be placed before D (500) and M (1000) to make 400 and 900.

Given a roman numeral, convert it to an integer.

# 思路1

## 分析

和前一道题同样的处理，两个数组，从数组最大的那一端开始比较
比较相等就加，不等就下一个。判断一下是否字母是两个的情况

## 代码实现

```go
func romanToInt(s string) (result int) {
	var intA = [...]int{1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900, 1000}
	var strA = [...]string{"I", "IV", "V", "IX", "X", "XL", "L", "XC", "C", "CD", "D", "CM", "M"}
	index := 0
	for i := len(strA) - 1; i >= 0; i-- {
		compareLen := len(strA[i])
		for index+compareLen <= len(s) && s[index:index+compareLen] == strA[i] {
			result += intA[i]
			index += compareLen
		}
	}
	return
}
```

# 思路2

## 分析

- 官方方法思路就是清奇
- 左边比右边小，就减去，大或者相等就加上

## 代码实现

```go
func romanToInt1(s string) (result int) {
	romToIntMap := map[byte]int{
		'I': 1,
		'V': 5,
		'X': 10,
		'L': 50,
		'C': 100,
		'D': 500,
		'M': 1000,
	}

	for i := range s {
		value := romToIntMap[s[i]]
		if i < len(s)-1 && romToIntMap[s[i+1]] > value {
			result -= value
			continue
		}
		result += value
	}
	return
}
```
