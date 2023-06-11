---
weight: 2719
title: "2719. Count of Integers"
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

# 思路1 数位dp（记忆化搜索）

## 分析

- 直接使用数位dp的记忆化搜索写法，求小于某个数的，所有位加在一起在给定范围的数量总和
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

# 思路2 数位dp（递推）

## 分析

- 从最高位开始构造，记录一个数组保存每一位可以到达的sum对应的数量，不包含上界，因为每一位都可以从0到9，到了上界就不能到9了
- 单独统计一下上界，假设前面的都到上界，当前位除了到上界的情况都可以统计到数组中
- 到最后一位时，需要判断最小值，前面不考虑最小值，只考虑最大值

## 代码

```go
func count2(num1 string, num2 string, min_sum int, max_sum int) int {
	var mod int = 1e9 + 7

	// 返回能取到的最大值
	getMax := func(s int) int {
		maxNum := 9
		if s+maxNum > max_sum {
			maxNum = max_sum - s
		}
		return maxNum
	}
	getMin := func(s int) int {
		minNum := min_sum - s
		if minNum < 0 {
			minNum = 0
		}
		return minNum
	}

	// 返回小于s的满足条件的数量
	getCount := func(s string) int {
		n := len(s)
		// 最后一位要特殊处理，所以这里要对只有一位的情况单独计算
		if n == 1 {
			num := int(s[0] - '0')
			if num < min_sum {
				return 0
			}
			return num - min_sum + 1
		}
		// 记录前一位可以到达某个sum的统计数量，要求下一位可以从0算到9，也就是当前不能到上界
		preState := make([]int, max_sum+1)
		limitSum := 0
		// 遍历到除最后一位，最后一位要判断最小值
		for _, v := range s[:n-1] {
			num := int(v - '0')
			curState := make([]int, max_sum+1)
			// 到前一位已经得到的sum为st
			for st, c := range preState {
				if c == 0 {
					continue
				}
				maxNum := getMax(st)
				for d := 0; d <= maxNum; d++ {
					curState[d+st] = (curState[d+st] + c) % mod
				}
			}
			// 算一下上界的情况，当前位除了到达上界，下一位都可以按照0到9算，所以直接加到状态中
			maxNum := getMax(limitSum)
			for d := 0; d <= maxNum && d < num; d++ {
				curState[d+limitSum] = (curState[d+limitSum] + 1) % mod
			}
			limitSum += num
			preState = curState
		}

		// 遍历最后一位
		res := 0
		for st, c := range preState {
			if c == 0 {
				continue
			}
			minNum := getMin(st)
			maxNum := getMax(st)
			for d := minNum; d <= maxNum; d++ {
				res = (res + c) % mod
			}
		}
		// 算一下上界
		maxNum := getMax(limitSum)
		minNum := getMin(limitSum)
		for d := minNum; d <= maxNum && d <= int(s[n-1]-'0'); d++ {
			res = (res + 1) % mod
		}
		return res
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
