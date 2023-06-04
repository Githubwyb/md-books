---
weight: 20
title: "20. Valid Parentheses"
---

# 题目

Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:

1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.
 
Example 1:

```
Input: s = "()"
Output: true
```

Example 2:

```
Input: s = "()[]{}"
Output: true
```

Example 3:

```
Input: s = "(]"
Output: false
```

Constraints:

- $1 <= s.length <= 10^4$
- s consists of parentheses only '()[]{}'.

# 思路1

## 分析

- 没啥说的，栈搞定就好

## 代码

```go
func isValid(s string) bool {
	n := len(s)
	if n%2 == 1 {
		return false
	}

	check := map[byte]byte{
		')': '(',
		']': '[',
		'}': '{',
	}
	stack := make([]byte, 0, 1)
	for _, v := range s {
		if t := check[byte(v)]; t > 0 {
			if len(stack) == 0 || t != stack[len(stack)-1] {
				return false
			}
			stack = stack[:len(stack)-1]
		} else {
			stack = append(stack, byte(v))
		}
	}
	return len(stack) == 0
}
```
