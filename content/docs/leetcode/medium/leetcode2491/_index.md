---
weight: 2491
title: "2491. Circular Sentence"
---

# 题目

You are given a positive integer array skill of even length n where skill[i] denotes the skill of the ith player. Divide the players into n / 2 teams of size 2 such that the total skill of each team is equal.

The chemistry of a team is equal to the product of the skills of the players on that team.

Return the sum of the chemistry of all the teams, or return -1 if there is no way to divide the players into teams such that the total skill of each team is equal.
 
Example 1:

```
Input: skill = [3,2,5,1,3,4]
Output: 22
Explanation:
Divide the players into the following teams: (1, 5), (2, 4), (3, 3), where each team has a total skill of 6.
The sum of the chemistry of all the teams is: 1 * 5 + 2 * 4 + 3 * 3 = 5 + 8 + 9 = 22.
```

Example 2:

```
Input: skill = [3,4]
Output: 12
Explanation:
The two players form a team with a total skill of 7.
The chemistry of the team is 3 * 4 = 12.
```

Example 3:

```
Input: skill = [1,1,2,3]
Output: -1
Explanation:
There is no way to divide the players into teams such that the total skill of each team is equal.
```

Constraints:

- $2 <= skill.length <= 10^5$
- skill.length is even.
- 1 <= skill[i] <= 1000

# 思路1 排序后遍历

## 分析

- 自己的想法麻烦得很，还是北大的牛逼
- 因为所有组相加都相等，所以最大的和最小的一起，中等和中等一起
- 那么先排序，计算最大和最小的和，然后遍历计算result，不符合相加等于对应值就是-1

## 代码

```go
func dividePlayers(skill []int) int64 {
	n := len(skill)
	sort.Ints(skill)
	tmp := skill[0] + skill[n-1]
	var result int64 = 0
	for i := 0; i < n/2; i++ {
		if tmp != skill[i] + skill[n-i-1] {
			return -1
		}
		result += int64(skill[i]*skill[n-i-1])
	}
	return result
}
```
