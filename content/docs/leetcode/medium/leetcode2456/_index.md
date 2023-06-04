---
weight: 2456
title: "2456. Most Popular Video Creator"
---

# 题目

You are given two string arrays creators and ids, and an integer array views, all of length n. The ith video on a platform was created by creator[i], has an id of ids[i], and has views[i] views.

The popularity of a creator is the sum of the number of views on all of the creator's videos. Find the creator with the highest popularity and the id of their most viewed video.

- If multiple creators have the highest popularity, find all of them.
- If multiple videos have the highest view count for a creator, find the lexicographically smallest id.

Return a 2D array of strings answer where answer[i] = [creatori, idi] means that creatori has the highest popularity and idi is the id of their most popular video. The answer can be returned in any order.

Example 1:

```
Input: creators = ["alice","bob","alice","chris"], ids = ["one","two","three","four"], views = [5,10,5,4]
Output: [["alice","one"],["bob","two"]]
Explanation:
The popularity of alice is 5 + 5 = 10.
The popularity of bob is 10.
The popularity of chris is 4.
alice and bob are the most popular creators.
For bob, the video with the highest view count is "two".
For alice, the videos with the highest view count are "one" and "three". Since "one" is lexicographically smaller than "three", it is included in the answer.
```

Example 2:

```
Input: creators = ["alice","alice","alice"], ids = ["a","b","c"], views = [1,2,2]
Output: [["alice","b"]]
Explanation:
The videos with id "b" and "c" have the highest view count.
Since "b" is lexicographically smaller than "c", it is included in the answer.
```

Constraints:

- n == creators.length == ids.length == views.length
- $1 <= n <= 10^5$
- 1 <= creators[i].length, ids[i].length <= 5
- creators[i] and ids[i] consist only of lowercase English letters.
- $0 <= views[i] <= 10^5$

# 思路1 使用map整理

## 分析

- 按照题意模拟即可，为了查找方便，使用map管理

## 代码

```go
type Author struct {
	id      string
	idPop   int // id对应的popular
	popular int
}

func mostPopularCreator(creators []string, ids []string, views []int) [][]string {
	allAuthor := make(map[string]Author)
	maxPopular := 0
	for i, name := range creators {
		id, view := ids[i], views[i]
		tmp := allAuthor[name]
		if tmp.id == "" {
			tmp = Author{
				id:      id,
				popular: view,
				idPop:   view,
			}
		} else {
			tmp.popular += view
			if view > tmp.idPop || (view == tmp.idPop && id < tmp.id) {
				tmp.id = id
				tmp.idPop = view
			}
		}
		if tmp.popular > maxPopular {
			maxPopular = tmp.popular
		}
		allAuthor[name] = tmp
	}

	result := make([][]string, 0)
	for k, v := range allAuthor {
		if v.popular == maxPopular {
			tmp := []string{k, v.id}
			result = append(result, tmp)
		}
	}

	return result
}
```
