---
weight: 948
title: "948. Bag of Tokens"
---

# 题目

You have an initial power of power, an initial score of 0, and a bag of tokens where tokens[i] is the value of the $i^{th}$ token (0-indexed).

Your goal is to maximize your total score by potentially playing each token in one of two ways:

- If your current power is at least tokens[i], you may play the $i^{th}$ token face up, losing tokens[i] power and gaining 1 score.
- If your current score is at least 1, you may play the $i^{th}$ token face down, gaining tokens[i] power and losing 1 score.
Each token may be played at most once and in any order. You do not have to play all the tokens.

Return the largest possible score you can achieve after playing any number of tokens.

# 思路1

## 分析

- 卖小的，买大的才能获得最大收益，排序必不可少
- 如果买了大的，卖不了小的，就可以不用继续了
- 这里注意，如果买了大的，却只能卖一个小的。这里不能停，因为可能再买一个大的，可以卖两个小的，还是赚的
- 用双指针进行运算

## 代码实现

```go
func bagOfTokensScore(tokens []int, power int) (score int) {
	sort.Ints(tokens) // Ascending

	l := 0
	r := len(tokens) - 1
	point := 0
	// token isn't used up and point can pay for one token or power can be used for one token
	for l <= r && (power > tokens[l] || point > 0) {
		if power >= tokens[l] {
			power -= tokens[l]
			l++
			point++
			continue
		}

		// can't pay at least one tokens
		if point < score {
			break
		}
		score = point
		power += tokens[r]
		r--
		point--
	}
	if point > score {
		return point
	}
	return
}
```

# 思路2

## 分析

- 官方的贪心算法
- 将所有tokens走一遍，过程中的最大收益返回

## 代码实现

```go
func bagOfTokensScore(tokens []int, power int) (score int) {
	sort.Ints(tokens) // Ascending

	l := 0
	r := len(tokens) - 1
	point := 0
	for l <= r && (power >= tokens[l] || point > 0) {
		for l <= r && power >= tokens[l] {
			power -= tokens[l]
			l++
			point++
		}

		if score < point {
			score = point
		}
		if l <= r && point > 0 {
			power += tokens[r]
			r--
			point--
		}
	}
	return
}
```
