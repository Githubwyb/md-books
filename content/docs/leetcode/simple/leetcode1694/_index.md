---
weight: 1694
title: "1694. Reformat Phone Number"
---

# 题目

You are given a phone number as a string number. number consists of digits, spaces ' ', and/or dashes '-'.

You would like to reformat the phone number in a certain manner. Firstly, remove all spaces and dashes. Then, group the digits from left to right into blocks of length 3 until there are 4 or fewer digits. The final digits are then grouped as follows:

- 2 digits: A single block of length 2.
- 3 digits: A single block of length 3.
- 4 digits: Two blocks of length 2 each.

The blocks are then joined by dashes. Notice that the reformatting process should never produce any blocks of length 1 and produce at most two blocks of length 2.

Return the phone number after formatting.

# 思路1

## 分析

- 自己想的，保留一个数组，如果大于4个，直接拆出前三个加一个`-`
- 最后如果剩余4个，拆成`22-22`，剩余不足4个，直接拼接到后面

## 代码实现

```go
func reformatNumber(number string) (result string) {
	var addStr []byte
	for i := range number {
		if number[i] == ' ' || number[i] == '-' {
			continue
		}
		addStr = append(addStr, number[i])
		if len(addStr) > 4 {
			result += string(addStr[:3]) + "-"
			addStr = addStr[3:]
		}
	}
	if len(addStr) == 4 {
		result += string(addStr[:2]) + "-" + string(addStr[2:])
	} else {
		result += string(addStr)
	}
	return
}
```

# 思路2

## 分析

- 直接三个三个拼接一个`-`
- 最后判断，最后一位是`-`，删掉
- 如果倒数第二位是`-`，和倒数第三位交换值

## 代码实现

```go
func reformatNumber(number string) string {
	addStr := make([]byte, 0, 4)
	result := make([]byte, 0, len(number))
	for i := range number {
		if number[i] == ' ' || number[i] == '-' {
			continue
		}
		addStr = append(addStr, number[i])
		if len(addStr) == 3 {
			addStr = append(addStr, '-')
			result = append(result, addStr...)
			addStr = addStr[:0]
		}
	}
	result = append(result, addStr...)
	if result[len(result)-1] == '-' {
		return string(result[:len(result)-1])
	} else if len(result) > 4 && result[len(result)-2] == '-' {
		result[len(result)-2] = result[len(result)-3]
		result[len(result)-3] = '-'
	}
	return string(result)
}
```
