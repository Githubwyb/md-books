---
weight: 2418
title: "2418. Sort the People"
---

# 题目

You are given an array of strings names, and an array heights that consists of distinct positive integers. Both arrays are of length n.

For each index `i`, `names[i]` and `heights[i]` denote the name and height of the ith person.

Return names sorted in descending order by the people's heights.

Example 1:

```
Input: names = ["Mary","John","Emma"], heights = [180,165,170]
Output: ["Mary","Emma","John"]
Explanation: Mary is the tallest, followed by Emma and John.
```

Example 2:

```
Input: names = ["Alice","Bob","Bob"], heights = [155,185,150]
Output: ["Bob","Alice","Bob"]
Explanation: The first Bob is the tallest, followed by Alice and the second Bob.
```


Constraints:

- `n == names.length == heights.length`
- $1 \le n \le 10^3$
- $1 \le names[i].length \le 20$
- $1 \le heights[i] \le 10^5$
- `names[i]` consists of lower and upper case English letters.
- All the values of heights are distinct.


# 思路1 排序

## 分析

- 使用go的sort，写一个对应的类型，调用Sort排序就好了

## 代码实现

```go
type NameSlice struct {
	names   []string
	heights []int
}

func (x NameSlice) Len() int           { return len(x.names) }
func (x NameSlice) Less(i, j int) bool { return x.heights[i] > x.heights[j] }
func (x NameSlice) Swap(i, j int) {
	x.heights[i], x.heights[j] = x.heights[j], x.heights[i]
	x.names[i], x.names[j] = x.names[j], x.names[i]
}

func sortPeople(names []string, heights []int) []string {
	tmp := NameSlice{
		names:   names,
		heights: heights,
	}
	sort.Sort(tmp)
	return tmp.names
}
```
