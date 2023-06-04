---
weight: 2582
title: "2582. Pass the Pillow"
---

# 题目

There are n people standing in a line labeled from 1 to n. The first person in the line is holding a pillow initially. Every second, the person holding the pillow passes it to the next person standing in the line. Once the pillow reaches the end of the line, the direction changes, and people continue passing the pillow in the opposite direction.

- For example, once the pillow reaches the nth person they pass it to the n - 1th person, then to the n - 2th person and so on.

Given the two positive integers n and time, return the index of the person holding the pillow after time seconds.

Example 1:

```
Input: n = 4, time = 5
Output: 2
Explanation: People pass the pillow in the following way: 1 -> 2 -> 3 -> 4 -> 3 -> 2.
Afer five seconds, the pillow is given to the 2nd person.
```

Example 2:

```
Input: n = 3, time = 2
Output: 3
Explanation: People pass the pillow in the following way: 1 -> 2 -> 3.
Afer two seconds, the pillow is given to the 3rd person.
```

Constraints:

- 2 <= n <= 1000
- 1 <= time <= 1000

# 思路1

## 分析

- 数学题，n个人，就是`2(n-1)`的周期
- 余数就开始算，小于`n-1`就是`1+tmp`
- 大于就是`2(n-1)-tmp+1`

## 代码

```go
func passThePillow(n int, time int) int {
	tmp := time % (n + n - 2)
	if tmp >= n-1 {
		return n + n - tmp - 1
	}
	return tmp + 1
}
```
