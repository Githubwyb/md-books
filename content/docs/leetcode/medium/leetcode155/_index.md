---
weight: 6280
title: "6280. Closest Prime Numbers in Range"
---

# 题目

Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.

Implement the MinStack class:

- MinStack() initializes the stack object.
- void push(int val) pushes the element val onto the stack.
- void pop() removes the element on the top of the stack.
- int top() gets the top element of the stack.
- int getMin() retrieves the minimum element in the stack.

You must implement a solution with O(1) time complexity for each function.

Example 1:

```
Input
["MinStack","push","push","push","getMin","pop","top","getMin"]
[[],[-2],[0],[-3],[],[],[],[]]

Output
[null,null,null,null,-3,null,0,-2]

Explanation
MinStack minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
minStack.getMin(); // return -3
minStack.pop();
minStack.top();    // return 0
minStack.getMin(); // return -2
```

Constraints:

- $-2^{31} <= val <= 2^{31} - 1$
- Methods pop, top and getMin operations will always be called on non-empty stacks.
- At most $3 \times 10^4$ calls will be made to push, pop, top, and getMin.

# 思路1 两个栈

## 分析

- 用一个栈存最小值，一个栈存值
- 节省空间就当值小于等于最小值才入最小值栈，同理只要出栈等于最小值，就出最小值栈

## 代码

```go
type MinStack3 struct {
	stack    []int
	minStack []int
}

func Constructor3() MinStack {
	return &MinStack3{
		stack:    make([]int, 0),
		minStack: make([]int, 0),
	}
}

func (this *MinStack3) Push(val int) {
	this.stack = append(this.stack, val)
	if len(this.minStack) == 0 || val <= this.minStack[len(this.minStack)-1] {
		this.minStack = append(this.minStack, val)
	}
}

func (this *MinStack3) Pop() {
	if len(this.stack) == 0 {
		return
	}
	v := this.stack[len(this.stack)-1]
	this.stack = this.stack[:len(this.stack)-1]
	if this.minStack[len(this.minStack)-1] == v {
		this.minStack = this.minStack[:len(this.minStack)-1]
	}
}

func (this *MinStack3) Top() int {
	return this.stack[len(this.stack)-1]
}

func (this *MinStack3) GetMin() int {
	return this.minStack[len(this.minStack)-1]
}
```

# 思路2 一个栈，存放值和最小值

## 分析

- 如何使用一个栈，考虑将最小值也放到这个栈里面，那么就是当值小于等于最小值时，先push前一次最小值，再push值
- 出栈时，如果值和当前最小值一样，下一个就是前一次最小值

## 代码

```go
type MinStack2 struct {
	stack []int
	min   int
}

func Constructor2() MinStack {
	return &MinStack2{
		stack: make([]int, 0),
		min:   math.MaxInt,
	}
}

func (this *MinStack2) Push(val int) {
	if val <= this.min {
		this.stack = append(this.stack, this.min)
		this.min = val
	}
	this.stack = append(this.stack, val)
}

func (this *MinStack2) Pop() {
	if len(this.stack) == 0 {
		return
	}
	v := this.stack[len(this.stack)-1]
	this.stack = this.stack[:len(this.stack)-1]
	if v == this.min {
		this.min = this.stack[len(this.stack)-1]
		this.stack = this.stack[:len(this.stack)-1]
	}
}

func (this *MinStack2) Top() int {
	return this.stack[len(this.stack)-1]
}

func (this *MinStack2) GetMin() int {
	return this.min
}
```

# 思路3 一个栈，存放值和最小值的差值

## 分析

- 一个栈加当前的int可以存放两个信息，如果栈里面存放的是值和当前最小值的差值就可以办到
- 入栈没什么说的，先入差值再判断是不是要更新最小值，因为先更新最小值会把前一次最小值的信息丢失掉
- 出栈就比较精髓了，当出栈的值小于0，说明入栈时值小于最小值，那么最小值就是当前值，而前一次最小值可以用当前值减去差值算出来

## 代码

```go
type MinStack1 struct {
	stack []int
	min   int
}

func Constructor() MinStack {
	return &MinStack1{
		stack: make([]int, 0),
		min:   math.MaxInt,
	}
}

func (this *MinStack1) Push(val int) {
	if len(this.stack) == 0 {
		this.min = val
		this.stack = append(this.stack, val-this.min)
	} else {
		this.stack = append(this.stack, val-this.min)
		if val < this.min {
			this.min = val
		}
	}
}

func (this *MinStack1) Pop() {
	if len(this.stack) == 0 {
		return
	}
	v := this.stack[len(this.stack)-1]
	this.stack = this.stack[:len(this.stack)-1]
	if v < 0 {
		this.min -= v
	}
}

func (this *MinStack1) Top() int {
	v := this.stack[len(this.stack)-1]
	if v < 0 {
		return this.min
	}
	return this.min + v
}

func (this *MinStack1) GetMin() int {
	return this.min
}
```
