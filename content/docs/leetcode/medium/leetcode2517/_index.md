---
weight: 2517
title: "2517. Maximum Tastiness of Candy Basket"
---

# 题目

You are given an array of positive integers price where price[i] denotes the price of the ith candy and a positive integer k.

The store sells baskets of k distinct candies. The tastiness of a candy basket is the smallest absolute difference of the prices of any two candies in the basket.

Return the maximum tastiness of a candy basket.

Example 1:

```
Input: price = [13,5,1,8,21,2], k = 3
Output: 8
Explanation: Choose the candies with the prices [13,5,21].
The tastiness of the candy basket is: min(|13 - 5|, |13 - 21|, |5 - 21|) = min(8, 8, 16) = 8.
It can be proven that 8 is the maximum tastiness that can be achieved.
```

Example 2:

```
Input: price = [1,3,1], k = 2
Output: 2
Explanation: Choose the candies with the prices [1,3].
The tastiness of the candy basket is: min(|1 - 3|) = min(2) = 2.
It can be proven that 2 is the maximum tastiness that can be achieved.
```

Example 3:

```
Input: price = [7,7,7,7], k = 2
Output: 0
Explanation: Choosing any two distinct candies from the candies we have will result in a tastiness of 0.
```

Constraints:

- $2 <= k <= price.length <= 10^5$
- $1 <= price[i] <= 10^9$

# 思路1 二分查找

## 分析

- 间隔越大，越不容易满足条件，那么正好可以使用二分查找第一个不满足条件的间隔，减一就是答案
- 二分想要认为从第一个找k个间隔大于等于d的，那么存在两种情况，第一个真的在里面，第一个不在里面

### 第一个在里面

- 分为第二个是要找的，和第二个不是要找的
- 第二个是要找的不用关心，第二个不是要找的，那么第二个实际肯定比当前要大，那么间隔d的第三个肯定满足比错误的第二个间隔大于d，不影响后续结果

### 第一个不是真实找的

- 同样分为第二个不是要找的和第二个是要找的
- 如果第二个是要找的，那么第一个和第二个间隔大于d，同样不影响
- 第二个不是要找的，第二个比真实第二个肯定要小，对应第三个肯定间隔也大于d，同样不影响

### 结论

- 直接从第一个开始找间隔大于等于d的是否存在即可

## 代码

```go
func maximumTastiness(price []int, k int) int {
	sort.Ints(price)
	return sort.Search((price[len(price)-1]-price[0])/(k-1), func(d int) bool {
		// 二分查找从0开始，而间隔最小是1，那么换算一下，真实间隔是d+1
		d++
		cnt, x := 1, price[0]
		for _, v := range price[1:] {
			if v >= x+d {
				cnt++
				x = v
			}
		}
		// 因为间隔越小越容易满足，那么二分的条件就是找到第一个不符合条件的d，那么减一就是要求的最大值
		// 正好d是间隔减一，直接返回即可
		return cnt < k
	})
}
```
