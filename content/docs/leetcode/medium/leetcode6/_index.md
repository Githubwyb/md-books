---
weight: 6
title: "6. ZigZag Conversion"
---

# 题目

The string "PAYPALISHIRING" is written in a zigzag pattern on a given number of rows like this: (you may want to display this pattern in a fixed font for better legibility)

```
P   A   H   N
A P L S I I G
Y   I   R
```

And then read line by line: "PAHNAPLSIIGYIR"

Write the code that will take a string and make this conversion given a number of rows:

```cpp
string convert(string s, int numRows);
```

# 思路1

这就是个数学题，每一个周期是 $n+(n-2)$

对于第一行和最后一行，字符所在位置为每一个周期的第 $i$ 个

对于其他行，字符所在位置为每一个周期的第 $i$ 个和倒数第 $i$ 个

所以直接写循环搞定

```go10
func convert(s string, numRows int) string {
	if numRows == 1 {
		return s
	}

	result := make([]byte, 0, len(s))
	for i := 0; i < numRows; i++ {
		index := 0
		for index+i < len(s) {
			// every line has index+i
			result = append(result, s[index+i])
			index += numRows + numRows - 2
			if i == 0 || i == numRows-1 {
				continue
			}

			// line except first line and last line, has index-i
			if index-i >= len(s) {
				break
			}
			result = append(result, s[index-i])
		}
	}
	return string(result)
}
```
