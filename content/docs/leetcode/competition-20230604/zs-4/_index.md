---
weight: 6396
title: "6396. Count of Integers"
---

# 题目

You are given two numeric strings num1 and num2 and two integers max_sum and min_sum. We denote an integer x to be good if:

- num1 <= x <= num2
- min_sum <= digit_sum(x) <= max_sum.

Return the number of good integers. Since the answer may be large, return it modulo 109 + 7.

Note that digit_sum(x) denotes the sum of the digits of x.

Example 1:

```
Input: num1 = "1", num2 = "12", min_num = 1, max_num = 8
Output: 11
Explanation: There are 11 integers whose sum of digits lies between 1 and 8 are 1,2,3,4,5,6,7,8,10,11, and 12. Thus, we return 11.
```

Example 2:

```
Input: num1 = "1", num2 = "5", min_num = 1, max_num = 5
Output: 5
Explanation: The 5 integers whose sum of digits lies between 1 and 5 are 1,2,3,4, and 5. Thus, we return 5.
```

Constraints:

- $1 <= num1 <= num2 <= 10^{22}$
- 1 <= min_sum <= max_sum <= 400

# 思路1 数位dp

## 分析

- 直接使用数位dp的写法，求小于某个数的，所有位加在一起在给定范围的数量总和
- 小于num2大于num1可以用，小于num2的数量减去小于`num1-1`的数量得到

## 代码

```go
func count(num1 string, num2 string, min_sum int, max_sum int) int {
	var mod int = 1e9 + 7
	// 返回小于s的满足条件的数量
	getCount := func(s string) int {
		// 状态记忆数组，第一维是位数，第二维是状态（当前表示为前面数字的和），value是数量
		memo := make([][]int, len(s))
		for i := range memo {
			memo[i] = make([]int, max_sum+1)
			for j := range memo[i] {
				memo[i][j] = -1
			}
		}

		// p为当前要枚举的位，0是最高位，len(s)-1是最低位
		// sum是前面位数的和
		// limitUp代表前面的数位是否都到达上界
		var dfs func(p, sum int, limitUp bool) (res int)
		dfs = func(p, sum int, limitUp bool) (res int) {
			if sum > max_sum {
				return
			}
			if p == len(s) {
				// 到头了，sum必须大于等于最小sum
				if sum >= min_sum {
					return 1
				}
				return
			}

			if !limitUp {
				// 没到上界才能取状态，否则状态是假的
				tmp := memo[p][sum]
				if tmp >= 0 {
					return tmp
				}
				defer func() { memo[p][sum] = res }()
			}
			up := 9
			if limitUp {
				up = int(s[p] - '0')
			}
			for d := 0; d <= up; d++ {
				res = (res + dfs(p+1, sum+d, limitUp && d == int(s[p]-'0'))) % mod
			}
			return
		}
		return dfs(0, 0, true)
	}

	ans := getCount(num2) - getCount(num1) + mod
	// 判断一下num1是否合法，上面直接减去了num1而不是num1-1，少算了num1
	sumNum1 := 0
	for _, c := range num1 {
		sumNum1 += int(c - '0')
	}
	if sumNum1 >= min_sum && sumNum1 <= max_sum {
		ans++
	}
	return ans % mod
}
```
