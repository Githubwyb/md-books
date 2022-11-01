---
weight: 2446
title: "2446. Determine if Two Events Have Conflict"
---

# 题目

You are given two arrays of strings that represent two inclusive events that happened on the same day, event1 and event2, where:

- event1 = [startTime1, endTime1] and
- event2 = [startTime2, endTime2].

Event times are valid 24 hours format in the form of HH:MM.

A conflict happens when two events have some non-empty intersection (i.e., some moment is common to both events).

Return true if there is a conflict between two events. Otherwise, return false.

Example 1:

```
Input: event1 = ["01:15","02:00"], event2 = ["02:00","03:00"]
Output: true
Explanation: The two events intersect at time 2:00.
```

Example 2:

```
Input: event1 = ["01:00","02:00"], event2 = ["01:20","03:00"]
Output: true
Explanation: The two events intersect starting from 01:20 to 02:00.
```

Example 3:

```
Input: event1 = ["10:00","11:00"], event2 = ["14:00","15:00"]
Output: false
Explanation: The two events do not intersect.
```

Constraints:

- evnet1.length == event2.length == 2.
- event1[i].length == event2[i].length == 5
- startTime1 <= endTime1
- startTime2 <= endTime2
- All the event times follow the HH:MM format.

# 思路1 字符串比较

## 分析

- 直接比较字符串就好了，字符串大的就是时间靠后

## 代码

```go
func haveConflict(event1 []string, event2 []string) bool {
	return strings.Compare(event1[0], event2[1]) <= 0 && strings.Compare(event1[1], event2[0]) >= 0
}
```
