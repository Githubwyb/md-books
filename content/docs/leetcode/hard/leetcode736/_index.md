---
weight: 736
title: "* 736. Parse Lisp Expression"
---

# 题目

You are given a string expression representing a Lisp-like expression to return the integer value of.

The syntax for these expressions is given as follows.

- An expression is either an integer, let expression, add expression, mult expression, or an assigned variable. Expressions always evaluate to a single integer.
- (An integer could be positive or negative.)
- A let expression takes the form "(let v1 e1 v2 e2 ... vn en expr)", where let is always the string "let", then there are one or more pairs of alternating variables and expressions, meaning that the first variable v1 is assigned the value of the expression e1, the second variable v2 is assigned the value of the expression e2, and so on sequentially; and then the value of this let expression is the value of the expression expr.
- An add expression takes the form "(add e1 e2)" where add is always the string "add", there are always two expressions e1, e2 and the result is the addition of the evaluation of e1 and the evaluation of e2.
- A mult expression takes the form "(mult e1 e2)" where mult is always the string "mult", there are always two expressions e1, e2 and the result is the multiplication of the evaluation of e1 and the evaluation of e2.
- For this question, we will use a smaller subset of variable names. A variable starts with a lowercase letter, then zero or more lowercase letters or digits. Additionally, for your convenience, the names "add", "let", and "mult" are protected and will never be used as variable names.
- Finally, there is the concept of scope. When an expression of a variable name is evaluated, within the context of that evaluation, the innermost scope (in terms of parentheses) is checked first for the value of that variable, and then outer scopes are checked sequentially. It is guaranteed that every expression is legal. Please see the examples for more details on the scope.

Example 1:

```
Input: expression = "(let x 2 (mult x (let x 3 y 4 (add x y))))"
Output: 14
Explanation: In the expression (add x y), when checking for the value of the variable x,
we check from the innermost scope to the outermost in the context of the variable we are trying to evaluate.
Since x = 3 is found first, the value of x is 3.
```

Example 2:

```
Input: expression = "(let x 3 x 2 x)"
Output: 2
Explanation: Assignment in let statements is processed sequentially.
```

Example 3:

```
Input: expression = "(let x 1 y 2 x (add x y) (add x y))"
Output: 5
Explanation: The first (add x y) evaluates as 3, and is assigned to x.
The second (add x y) evaluates as 3+2 = 5.
```


Constraints:

- 1 <= expression.length <= 2000
- There are no leading or trailing spaces in expression.
- All tokens are separated by a single space in expression.
- The answer and all intermediate calculations of that answer are guaranteed to fit in a 32-bit integer.
- The expression is guaranteed to be legal and evaluate to an integer.

# 思路1

## 分析

- 分析此题是要用递归，并且要注意表达式作用域

1. 首先需要对表达式进行解析，将每一个表达式解析成数组，这一步是需要将括号完整解析

```go
// parseExpression, preprocess the expression
// convert '(let x 1 y 2 (let x 2 y (add 1 2) x))' to ['let' 'x' '1' 'y' '2' '(let x 2 y (add 1 2) x)']
func parseExpression(expression string) (result []string)
```

2. 然后需要解析value
  - value是变量，从作用域中取值
  - 表达式，递归求值传入作用域
  - 数字，解析

```go
// getValue, get value of input
// number => number
// var => paramMap[var]
// expression => parse(expression)
func getValue(input string, paramMap map[string]int) int
```

3. 重点来了，真正解析的函数，需要控制变量作用域，每一次递归，将上层的变量拷贝一份，生成自己的变量map

```go
// parse (let e1 v1 e2 v2 expr)
// will copy paramMap and make itself paramMap1
func parse(expression string, paramMap map[string]int) int
```

## 代码实现

```go
package main

import (
	_ "fmt"
	"strconv"
)

// parseExpression, preprocess the expression
// convert '(let x 1 y 2 (let x 2 y (add 1 2) x))' to ['let' 'x' '1' 'y' '2' '(let x 2 y (add 1 2) x)']
func parseExpression(expression string) (result []string) {
	if expression[0] != '(' || expression[len(expression)-1] != ')' {
		panic("expression not valid")
	}

	for index := 1; index < len(expression)-1; index++ {
		// find full ()
		if expression[index] == '(' {
			stack := 1
			i := index + 1
			for ; i < len(expression); i++ {
				if expression[i] == '(' {
					stack++
					continue
				}

				if expression[i] == ')' {
					stack--
					if stack == 0 {
						break
					}
				}
			}

			result = append(result, expression[index:i+1])
			index = i + 1
			continue
		}

		// find next space
		i := index + 1
		for ; i < len(expression); i++ {
			if expression[i] == ' ' {
				break
			}
		}
		if i == len(expression) {
			result = append(result, expression[index:len(expression)-1])
			break
		}
		result = append(result, expression[index:i])
		index = i
	}
	return
}

// getValue, get value of input
// number => number
// var => paramMap[var]
// expression => parse(expression)
func getValue(input string, paramMap map[string]int) int {
	if input[0] == '(' {
		return parse(input, paramMap)
	}
	if v, ok := paramMap[input]; ok {
		return v
	}
	tmp, err := strconv.ParseInt(input, 10, 64)
	if err != nil {
		panic(err)
	}
	return int(tmp)
}

// parse (let e1 v1 e2 v2 expr)
// will copy paramMap and make itself paramMap1
func parse(expression string, paramMap map[string]int) int {
	if expression[0] != '(' || expression[len(expression)-1] != ')' {
		panic("expression not valid")
	}
	paramMap1 := make(map[string]int)
	// copy paramMap
	for k, v := range paramMap {
		paramMap1[k] = v
	}

	// split expression to array
	arr := parseExpression(expression)
	if arr[0] == "add" || arr[0] == "mult" {
		if len(arr) != 3 {
			panic("add need three element, " + expression)
		}

		if arr[0] == "add" {
			return getValue(arr[1], paramMap1) + getValue(arr[2], paramMap1)
		}
		return getValue(arr[1], paramMap1) * getValue(arr[2], paramMap1)
	}

	if arr[0] == "let" {
		// make self scope
		for i := 2; i < len(arr)-1; i += 2 {
			paramMap1[arr[i-1]] = getValue(arr[i], paramMap1)
		}
		return getValue(arr[len(arr)-1], paramMap1)
	}
	panic("not support " + arr[0])
}

func evaluate(expression string) int {
	return parse(expression, nil)
}
```
