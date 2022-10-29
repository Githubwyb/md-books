---
weight: 1169
title: "- 1169. Invalid Transactions"
---

# 题目

A transaction is possibly invalid if:

the amount exceeds `$1000`, or;
if it occurs within (and including) 60 minutes of another transaction with the same name in a different city.
You are given an array of strings transaction where `transactions[i]` consists of comma-separated values representing the name, time (in minutes), amount, and city of the transaction.

Return a list of transactions that are possibly invalid. You may return the answer in any order.

# 思路1

## 分析

- 自己想的，记录之前的交易信息，新的交易信息和之前进行对比，如果出现问题就记录
- 使用map查找，加快速度

## 代码实现

```go
type transactionInfo struct {
	name      string
	time      int64
	amount    int64
	city      string
	hasOut    bool
	originStr string
}

func parseTransaction(str string) (info transactionInfo) {
	arr := strings.Split(str, ",")
	info.name = arr[0]
	info.time, _ = strconv.ParseInt(arr[1], 10, 64)
	info.amount, _ = strconv.ParseInt(arr[2], 10, 64)
	info.city = arr[3]
	info.hasOut = false
	info.originStr = str
	return
}

func appendResult(info *transactionInfo, result *[]string) {
	if info.hasOut {
		return
	}
	*result = append(*result, info.originStr)
	info.hasOut = true
}

func invalidTransactions(transactions []string) []string {
	recordMap := make(map[string][]transactionInfo)

	var result []string
	for _, v := range transactions {
		info := parseTransaction(v)

		// 先判断是否超出1000
		if info.amount > 1000 {
			appendResult(&info, &result)
		}

		// 判断是否之前有记录，不存在直接继续
		lastInfos, ok := recordMap[info.name]
		if !ok {
			recordMap[info.name] = []transactionInfo{info}
			continue
		}

		// 判断是否是小于60并不在同一个城市
		for i, lastInfo := range lastInfos {
			if lastInfo.city != info.city && (info.time-lastInfo.time <= 60 && info.time-lastInfo.time >= -60) {
				appendResult(&info, &result)
				appendResult(&lastInfos[i], &result)
			}
		}
		lastInfos = append(lastInfos, info)
		recordMap[info.name] = lastInfos
	}

	return result
}
```

# 思路2

## 分析

- 官方的也挺暴力的，就是全遍历，当前交易和后面所有对比一遍，出现问题就记录

## 代码实现

```go
func invalidTransactions1(transactions []string) []string {
	var result []string

	// 遍历当前交易，和后面冲突就记录，跳出继续
	for i, v := range transactions {
		info := parseTransaction(v)

		if info.amount > 1000 {
			result = append(result, info.originStr)
			continue
		}

		for j, v1 := range transactions {
			if j == i {
				continue
			}
			info1 := parseTransaction(v1)
			if info.name == info1.name && info1.city != info.city && (info.time-info1.time <= 60 && info.time-info1.time >= -60) {
				result = append(result, info.originStr)
				break
			}

		}
	}
	return result
}
```
