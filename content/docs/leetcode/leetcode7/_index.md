---
weight: 7
title: "- 7. Reverse Integer"
---

# 题目

Given a signed 32-bit integer x, return x with its digits reversed. If reversing x causes the value to go outside the signed 32-bit integer range $[-2^{31}, 2^{31} - 1]$, then return 0.

Assume the environment does not allow you to store 64-bit integers (signed or unsigned).

# 思路1

**数学推导**

反转不难，重点是不允许用64位的变量，所以要考虑边界

从输入x的倒序开始遍历，设每一位都为digit，那么每一个循环都有

$$
result = result \times 10 + digit
$$

如果可以反转到超出 $[-2^{31}, 2^{31} - 1]$，那么在前一个循环，result必须满足

$$
result \ge \lfloor \frac{2^{31} - 1}{10} \rfloor = 214748364 \vee result \le \lceil -\frac{2^{31}}{10} \rceil = -214748364 \tag{1}
$$

如果取等号，digit则需要满足

$$
\left\\{
\begin{array}{ll}
    digit > 7 & if & x > 0 \\\\
    digit > 8 & if & x < 0
\end{array}
\right.
$$

假设x满足反转超出，x的位数肯定和 $2^{31}$ 一致，最高位也就是反转后的个位数满足 $digit \le 2$

也就是(1)式取等号时，反转不会超出范围，只用判断不取等号的情况

**代码实现**

为了防止每次对x进行除法和取余运算，直接转成字符串处理

```go
func reverse(x int) (result int) {
	tmp := fmt.Sprint(x)
	for i := range(tmp) {
		if tmp[len(tmp)-i-1] == '-' {
			result = -result
			break
		}
		if result > math.MaxInt32 / 10 || result < math.MinInt32 / 10 {
			result = 0
			return
		}
		result *= 10
		result += int(tmp[len(tmp)-1-i] - '0')
	}
	return
}
```
