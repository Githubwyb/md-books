---
weight: 6473
title: "6473. Maximum Sum Queries"
---

# 题目

You are given two 0-indexed integer arrays nums1 and nums2, each of length n, and a 1-indexed 2D array queries where queries[i] = [xi, yi].

For the ith query, find the maximum value of nums1[j] + nums2[j] among all indices j (0 <= j < n), where nums1[j] >= xi and nums2[j] >= yi, or -1 if there is no j satisfying the constraints.

Return an array answer where answer[i] is the answer to the ith query.

Example 1:

```
Input: nums1 = [4,3,1,2], nums2 = [2,4,9,5], queries = [[4,1],[1,3],[2,5]]
Output: [6,10,7]
Explanation:
For the 1st query xi = 4 and yi = 1, we can select index j = 0 since nums1[j] >= 4 and nums2[j] >= 1. The sum nums1[j] + nums2[j] is 6, and we can show that 6 is the maximum we can obtain.

For the 2nd query xi = 1 and yi = 3, we can select index j = 2 since nums1[j] >= 1 and nums2[j] >= 3. The sum nums1[j] + nums2[j] is 10, and we can show that 10 is the maximum we can obtain.

For the 3rd query xi = 2 and yi = 5, we can select index j = 3 since nums1[j] >= 2 and nums2[j] >= 5. The sum nums1[j] + nums2[j] is 7, and we can show that 7 is the maximum we can obtain.

Therefore, we return [6,10,7].
```

Example 2:

```
Input: nums1 = [3,2,5], nums2 = [2,3,4], queries = [[4,4],[3,2],[1,1]]
Output: [9,9,9]
Explanation: For this example, we can use index j = 2 for all the queries since it satisfies the constraints for each query.
```

Example 3:

```
Input: nums1 = [2,1], nums2 = [2,3], queries = [[3,3]]
Output: [-1]
Explanation: There is one query in this example with xi = 3 and yi = 3. For every index, j, either nums1[j] < xi or nums2[j] < yi. Hence, there is no solution.
```

Constraints:

- nums1.length == nums2.length
- n == nums1.length
- $1 <= n <= 10^5$
- $1 <= nums1[i], nums2[i] <= 10^9$
- $1 <= queries.length <= 10^5$
- queries[i].length == 2
- xi == queries[i][1]
- yi == queries[i][2]
- $1 <= xi, yi <= 10^9$

# 思路1 降维+分类讨论+单调栈

## 分析

- 三个数要比较，降维为两个数，先对x排序，查询的x也同样排序
- 那么对于某个query，一定有一组数据x满足条件，就只需要考虑x和sum了
- 维护一个列表，对于要入列表的元素
    1. 如果y比列表所有的都大，sum大于等于某个元素，这个元素不需要了，因为x肯定满足的情况下，y更大且sum较大，肯定更加能满足query
    2. 如果y比列表所有的都大，sum小，放后面，先看sum较大的满不满足
    3. 如果y在列表的中间范围，那么一定有一个x大于等于它，y也大于等于它，sum肯定大于等于它，这个就没必要判断了
    4. 如果y比列表中所有的都小，同上
- 所以只需要插入y比列表所有都大的就行了，并且sum较小还放后面，sum较大就只剩一个，最终列表就是sum从大到小，y从小到大
- 查找时直接二分找y就好了
- 看起来这个列表就是单调栈（栈底sum最大，栈顶y最大），只需要对比栈顶元素即可

## 代码

```go
func maximumSumQueries(nums1 []int, nums2 []int, queries [][]int) []int {
	n := len(nums1)
	type pair struct{ x, y int }
	pairs := make([]pair, n)
	for i := range nums1 {
		pairs[i] = pair{
			x: nums1[i],
			y: nums2[i],
		}
	}
	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].x > pairs[j].x
	})

	// 把索引放到第三位，这样动了queries不影响答案的结果
	for i := range queries {
		queries[i] = append(queries[i], i)
	}
	sort.Slice(queries, func(i, j int) bool {
		return queries[i][0] > queries[j][0]
	})

	var st []pair
	res := make([]int, len(queries))
	i := 0 // pairs的索引
	for _, v := range queries {
		x, y, index := v[0], v[1], v[2]
		for ; i < n && pairs[i].x >= x; i++ {
			p := pairs[i]
			if len(st) == 0 {
				st = []pair{p}
				continue
			}
			// 比最大的y大，才可以入栈
			if p.y <= st[len(st)-1].y {
				continue
			}
			// 从栈顶向栈底遍历，sum小于等于y的都不要了
			for i := len(st) - 1; i >= 0 && p.x+p.y >= st[i].x+st[i].y; i-- {
				st = st[:i]
			}
			st = append(st, p)
		}

		// 二分在栈内找第一个y大于等于query的即可
		i := sort.Search(len(st), func(i int) bool {
			return st[i].y >= y
		})
		if i == len(st) {
			res[index] = -1
		} else {
			res[index] = st[i].x + st[i].y
		}
	}
	return res
}
```

# 思路2 降维+区间最值（线段树）

## 分析

- 降维是肯定的，这次只排序nums，对x从大到小排序
- 然后遍历一边对y进行处理，当y小于等于前面最大的y，那么肯定有一个x比它大，y也比它大，sum更比它大，这个就没有价值，不要了
- 然后就得到一个x从大到小，y从小到大的数组
- 下面对query的查询，就能查到一个区间`[a, b]`，问题转化成区间最大值，区间最大值使用线段树实现

