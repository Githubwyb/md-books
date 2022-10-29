---
weight: 1352
title: "- 1352. Product of the Last K Numbers"
---

# 题目

Design an algorithm that accepts a stream of integers and retrieves the product of the last k integers of the stream.

Implement the ProductOfNumbers class:

- `ProductOfNumbers()` Initializes the object with an empty stream.
- `void add(int num)` Appends the integer num to the stream.
- `int getProduct(int k)` Returns the product of the last k numbers in the current list. You can assume that always the current list has at least k numbers.

The test cases are generated so that, at any time, the product of any contiguous sequence of numbers will fit into a single 32-bit integer without overflowing.

# 思路1

## 分析

- 第一想法，放一个链表或者数组，存放传入的数字，然后返回后k个数字的乘积
- 这题这么简单？？超时了。。。

# 思路2

## 分析

- 嫌弃计算时间长，我先计算，然后需要的是否返回结果
- 放一个数组，传入一个数字，把后k个数字的乘积算好
- 新传入，把前面的结果每个都乘以新数字，把新数字放到最后
- 要结果就直接返回，不给你算，就不会超时
- 提交过了。。。时间打败0%。。。内存也打败0%

# 思路3

## 分析

- 内存优化一下，好像我不用存所有的数字，只用存结果就好了
- 计算的方面，每次都要所有结果乘以这个数字，好像确实要时间
- 偷偷看一眼官方解答，考虑0的情况！！！所得寺内~~~
- 发现数字为0，清理结果，判断要结果小于数组长度直接返回0就好了
- 提交过了，内存倒是打败80%，但是时间打败10%。。。

# 思路4

## 分析

- 再偷瞄一眼官方解答，不用每次来个数字把所有结果都乘一遍，换个思路
- 存前n个数的乘积而不是后n个数的乘积，这样来的数字只用乘以结果最后一个，然后插入到数组中就好了
- 但是要结果的时候，需要后k个数的乘积

$$
后k个数的乘积 = \frac{前n个数的乘积}{前n-k个数的乘积}
$$

- 终于内存70%，时间80%了

## 代码实现

- 上面的公式是示意公式，我们设数组`result[i]`代表前i个数的乘积，那么边界`result[0]`代表前0个数，为了表示方便，设置成1
- 结果需要前k个数的乘积，按照上面的数据举个例子，假设n为5，数组长度为6（包含第0个）
- 需要后3个数的乘积，有 $n=6, k=3$

$$
后3个数的乘积 = \frac{1 \times a_1 \times a_2 \times a_3 \times a_4 \times a_5}{1 \times a_1 \times a_2} = \frac{result[n-1]}{result[n-k-1]}
$$

- 由于 $n-k-1$ 需要大于等于0，所以 $k \le n - 1$

```go
type ProductOfNumbers struct {
	result []int
}

func Constructor() (this ProductOfNumbers) {
	this.result = append(this.result, 1)
	return
}

func (this *ProductOfNumbers) Add(num int) {
	if num == 0 {
		this.result = this.result[:1]
		return
	}
	this.result = append(this.result, this.result[len(this.result)-1]*num)
}

func (this *ProductOfNumbers) GetProduct(k int) int {
	if k > len(this.result)-1 {
		return 0
	}
	return this.result[len(this.result)-1] / this.result[len(this.result)-k-1]
}

/**
 * Your ProductOfNumbers object will be instantiated and called as such:
 * obj := Constructor();
 * obj.Add(num);
 * param_2 := obj.GetProduct(k);
 */
```

# 思路5

## 分析

- 第一个1占内存，优化一下

## 代码实现

- 再来一次，我们设数组`result[i]`代表前 $i-1$ 个数的乘积，那么边界`result[0]`代表前1个数
- 结果需要前k个数的乘积，按照上面的数据举个例子，假设n为5，数组长度为5
- 需要后3个数的乘积，有 $n=5, k=3$

$$
后3个数的乘积 = \frac{a_1 \times a_2 \times a_3 \times a_4 \times a_5}{a_1 \times a_2} = \frac{result[n-1]}{result[n-k-1]}
$$

- 边界情况，k和n相等，没有被除数，所以 $k = n$ 直接返回 $result[n-1]$

```go
type ProductOfNumbers struct {
	result []int
}

func Constructor() (this ProductOfNumbers) {
	return
}

func (this *ProductOfNumbers) Add(num int) {
	if num == 0 {
		this.result = this.result[:0]
		return
	}
	if len(this.result) == 0 {
		this.result = append(this.result, num)
		return
	}
	this.result = append(this.result, this.result[len(this.result)-1]*num)
}

func (this *ProductOfNumbers) GetProduct(k int) int {
	if k == len(this.result) {
		return this.result[len(this.result)-1]
	}
	if k > len(this.result) {
		return 0
	}
	return this.result[len(this.result)-1] / this.result[len(this.result)-k-1]
}

/**
 * Your ProductOfNumbers object will be instantiated and called as such:
 * obj := Constructor();
 * obj.Add(num);
 * param_2 := obj.GetProduct(k);
 */
```

# 思路6

## 分析

- 官方的第二种解法，感觉更加厉害
- 由于要求的是乘积，并且规定返回的一定在32位以内，所以推断非0和1的部分最多不超过32个数
- 记录所有的非0和1的数，然后一个一个乘即可

## 代码实现

转化成代码语言，取三个数组储存数据

- `vec[i]`: 储存所有数据
- `cnt[i]`: 储存前i个数据中0的个数
- `pre[i]`: 前 $i-1$ 个数据最后一个非0和1的数的位置

其中`cnt[i]`有

$$
cnt[i] = \left\\{
\begin{array}{ll}
    cnt[i-1] & if & vec[i] \ne 0 \\\\
    cnt[i-1]+1 & if & vec[i] = 0
\end{array}
\right.
$$

`pre[i]`有

$$
pre[i] = \left\\{
\begin{array}{ll}
    pre[i-1] & if & vec[i-1] \le 1 \\\\
    i-1 & if & vec[i-1] \gt 0
\end{array}
\right.
$$

获取数据时有

$$
GetProduct(k) = \left\\{
\begin{array}{ll}
    0 & if & cnt[n-1]-cnt[n-1-k] \gt 0 \\\\
    other & if & cnt[n-1]-cnt[n-1-k] = 0
\end{array}
\right.
$$

```go
type ProductOfNumbers struct {
	vec []int
	cnt []int
	pre []int
}

func Constructor() (this ProductOfNumbers) {
	return
}

func (this *ProductOfNumbers) Add(num int) {
	n := len(this.vec)
	this.vec = append(this.vec, num)
	this.pre = append(this.pre, -1)

	// update cnt
	cnt := 0
	if n > 0 {
		// get last result
		cnt = this.cnt[n-1]
	}
	if num == 0 {
		cnt++
	}
	this.cnt = append(this.cnt, cnt)

	// update pre
	if n == 0 {
		return
	}
	if this.vec[n-1] <= 1 {
		this.pre[n] = this.pre[n-1]
	} else {
		this.pre[n] = n - 1
	}
}

func (this *ProductOfNumbers) GetProduct(k int) int {
	n := len(this.vec)
	tot := this.cnt[n-1]
	if k < n {
		tot -= this.cnt[n-1-k]
	}
	if tot > 0 {
		return 0
	}

	result := 1
	// n-i-1 represent the next number to be used from the bottom
	// eg: i = n - 1, n-i-1 = 0, will use the 0th number from the bottom
	// which also represent the result contains 0 numbers
	for i := n - 1; (n - i - 1) < k; i = this.pre[i] {
		result *= this.vec[i]
	}
	return result
}
```
