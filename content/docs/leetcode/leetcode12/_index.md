---
weight: 12
title: "- 12. Integer to Roman"
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

Given an integer, convert it to a roman numeral.

# 思路1

## 分析

递归实现，每次减去一个范围内最大的数字，加一个字母

## 代码实现

```go
var intA = [...]int{1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900, 1000}
var strA = [...]string{"I", "IV", "V", "IX", "X", "XL", "L", "XC", "C", "CD", "D", "CM", "M"}

func intToRoman(num int) string {
	for i := len(intA) - 1; i >= 0; i-- {
		if num >= intA[i] {
			return strA[i] + intToRoman(num-intA[i])
		}
	}
	return ""
}
```

# 思路2

## 分析

- 果然递归时间长耗内存，虽然代码少
- 转非递归实现

## 代码实现

```go
func intToRoman1(num int) (result string) {
	var intA = [...]int{1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900, 1000}
	var strA = [...]string{"I", "IV", "V", "IX", "X", "XL", "L", "XC", "C", "CD", "D", "CM", "M"}

	for i := len(intA) - 1; i >= 0; i-- {
		for num >= intA[i] {
			num -= intA[i]
			result += strA[i]
		}
	}
	return
}
```

# 思路3

## 分析

- 千位搞个表
- 百位搞个表
- 十位搞个表
- 个位搞个表
- 直接每一位按照表取拼接即可
