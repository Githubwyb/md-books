---
weight: 864
title: "864. Shortest Path to Get All Keys"
---

# 题目

You are given an `m` `x` `n` grid `grid` where:

- '.' is an empty cell.
- '#' is a wall.
- '@' is the starting point.
- Lowercase letters represent keys.
- Uppercase letters represent locks.

You start at the starting point and one move consists of walking one space in one of the four cardinal directions. You cannot walk outside the grid, or walk into a wall.

If you walk over a key, you can pick it up and you cannot walk over a lock unless you have its corresponding key.

For some 1 <= k <= 6, there is exactly one lowercase and one uppercase letter of the first k letters of the English alphabet in the grid. This means that there is exactly one key for each lock, and one lock for each key; and also that the letters used to represent the keys and locks were chosen in the same order as the English alphabet.

Return the lowest number of moves to acquire all keys. If it is impossible, return -1.

# 思路1

## 分析

- 自己没想出来，使用官方解法
- 使用bfs可以计算点到其他点的距离
- 使用全排列将所有钥匙位置顺序给出来，使用bfs直接找所有方案步数，然后返回最小

## 代码实现

```go
type pointT struct {
	x int
	y int
}

var (
	// 按照上下左右的相对位置设定，用于后面方便找四周的点
	kRoundPoints = [][]int{
		{0, -1},
		{0, 1},
		{-1, 0},
		{1, 0},
	}
)

func shortestPathAllKeys(grid []string) int {
	// location['a'] is the (x, y) of a
	location := make(map[byte]pointT)
	for i := 0; i < len(grid); i++ {
		for j := 0; j < len(grid[0]); j++ {
			ch := grid[i][j]
			if ch != '.' && ch != '#' {
				location[ch] = pointT{j, i}
			}
		}
	}
	keyNums := len(location) / 2
	// 枚举到所有的钥匙，题目条件只会从a-b、a-c、a-d、a-e、a-f几种情况
	alphabet := make([]byte, keyNums)
	for i := 0; i < keyNums; i++ {
		alphabet[i] = byte('a' + i)
	}

	res := -1
	permutation(alphabet, 0, func(str []byte) {
		ans := 0
		keymask := 0
		for i := 0; i < len(str); i++ {
			var src byte
			if i == 0 {
				src = '@'
			} else {
				src = alphabet[i-1]
			}
			tmp := bfs(location[src], location[alphabet[i]], grid, keymask)
			if tmp == -1 {
				return
			}
			ans += tmp
			keymask |= 1 << (alphabet[i] - 'a')
		}
		if res == -1 || ans < res {
			res = ans
		}
	})
	return res
}

// 全排列
func permutation(str []byte, index int, f func(str []byte)) {
	if len(str) == index {
		f(str)
		return
	}

	// 不交换的场景
	permutation(str, index+1, f)
	// index对应位置向后交换
	for i := index + 1; i < len(str); i++ {
		str[i], str[index] = str[index], str[i]
		permutation(str, index+1, f)
		str[i], str[index] = str[index], str[i]
	}
}

// 计算src到dst的最短路径长度，keymask为按位标记某个钥匙是否已找到
// 返回从src到dst的最短路径长度
func bfs(src pointT, dst pointT, grid []string, keymask int) int {
	// 减小计算量，走过的路不再走，记录一下哪里走过了
	seen := make([][]bool, len(grid))
	for i := range seen {
		seen[i] = make([]bool, len(grid[0]))
	}
	// 源地址记录走过了，注意x是第二维的坐标
	seen[src.y][src.x] = true

	// 使用层数作为步数
	curDepth := 0
	var queue list.List
	// 插入源地址，作为第一层，使用nil作为层间隔
	queue.PushBack(src)
	queue.PushBack(nil)
	// 队列一定含有一个层间隔，不在头就在尾，如果只剩一个层间隔，说明没路可走
	for queue.Len() > 1 {
		tmp := queue.Front().Value
		queue.Remove(queue.Front())
		if tmp == nil {
			// 找到层间隔，说明当前层遍历完了，步数加一准备下一层
			curDepth++
			// 当前层遍历完，队列剩余的都是下一层，加入一个层间隔
			queue.PushBack(nil)
			continue
		}

		// 判断当前点是不是目标点，如果是，说明走到了，返回步数
		tx, ty := tmp.(pointT).x, tmp.(pointT).y
		if tx == dst.x && ty == dst.y {
			return curDepth
		}
		// 不是目标点，从此点出发，向四周走一下
		for i := range kRoundPoints {
			px, py := tx+kRoundPoints[i][0], ty+kRoundPoints[i][1]
			// 如果超出边界或者已经走过了或者碰到墙，就继续
			if py < 0 || py >= len(grid) || px < 0 || px >= len(grid[0]) || seen[py][px] || grid[py][px] == '#' {
				continue
			}
			ch := grid[py][px]
			// 如果是锁，看一下有没有钥匙，没有钥匙就跳过
			if (ch <= 'Z' && ch >= 'A') && ((1<<(ch-'A'))&keymask) == 0 {
				continue
			}
			// 这个点可以走，走上去，记录到队列中，作为下一层的起点
			seen[py][px] = true
			queue.PushBack(pointT{px, py})
		}
	}
	return -1
}
```

# 思路2

## 分析

- 来自网上其他网友的方案，使用bfs，但是将状态加到bfs判断中，也就是三维的bfs

## 代码

```go
type pointST struct {
	x     int
	y     int
	step  int
	state int
}

func shortestPathAllKeys1(grid []string) int {
	// location['a'] is the (x, y) of a
	location := make(map[byte]pointST)
	for i := 0; i < len(grid); i++ {
		for j := 0; j < len(grid[0]); j++ {
			ch := grid[i][j]
			if ch != '.' && ch != '#' {
				location[ch] = pointST{j, i, 0, 0}
			}
		}
	}
	keyNums := len(location) / 2
	finalState := (1 << keyNums) - 1

	// 将钥匙的持有状态作为判断成三维的bfs
	return bfsThree(location['@'], grid, finalState)
}

// 将钥匙的持有状态作为判断成三维的bfs
func bfsThree(src pointST, grid []string, finalState int) int {
	sx, sy := src.x, src.y

	// 减小计算量，走过的路不再走，记录一下哪里走过了
	seen := make([][][]bool, len(grid))
	for i := range seen {
		seen[i] = make([][]bool, len(grid[0]))
		for j := range seen[i] {
			seen[i][j] = make([]bool, finalState+1)
		}
	}
	seen[sy][sx][0] = true

	var queue list.List
	queue.PushBack(src)
	for queue.Len() > 0 {
		tmp := queue.Front().Value
		queue.Remove(queue.Front())

		// 判断当前点是不是已经达成目标
		tx, ty, step, state := tmp.(pointST).x, tmp.(pointST).y, tmp.(pointST).step, tmp.(pointST).state
		if state == finalState {
			return step
		}
		// 不是目标点，从此点出发，向四周走一下
		for i := range kRoundPoints {
			px, py := tx+kRoundPoints[i][0], ty+kRoundPoints[i][1]
			// 如果超出边界或者碰到墙，就继续
			if py < 0 || py >= len(grid) || px < 0 || px >= len(grid[0]) || grid[py][px] == '#' {
				continue
			}
			// 判断是否曾以相同状态要走过这个点
			if seen[py][px][state] {
				continue
			}
			ch := grid[py][px]
			// 如果是锁，看一下有没有钥匙，没有钥匙就跳过
			if (ch <= 'Z' && ch >= 'A') && ((1<<(ch-'A'))&state) == 0 {
				continue
			}
			// 可以踩上去，就记录踩上去前的状态
			seen[py][px][state] = true
			// 如果是钥匙，保存新的状态到队列中
			tmpState := state
			if ch <= 'z' && ch >= 'a' {
				tmpState |= (1 << (ch - 'a'))
			}
			// 记录到队列中，作为下一层的点
			queue.PushBack(pointST{px, py, step + 1, tmpState})
		}
	}
	return -1
}
```

# 思路3

## 分析

- 来自官方的方案，将每个钥匙和key都作为关键点，计算出所有关键点之间的距离（不解锁）
- 相当于如果要从a解锁A到达b，那么关键点就是`a -> A`+`A -> b`，而不是a到b
- 计算出来之后，这个map进行Dijkastra算法，计算到达某个状态下的最低步数

## 代码

```go
type pointTT struct {
	x     int
	y     int
	step  int
	state int
}

type littleQueue []pointTT

func (q *littleQueue) Push(v interface{}) {
	*q = append(*q, v.(pointTT))
}
func (q *littleQueue) Pop() interface{} {
	x := (*q)[len(*q)-1]
	*q = (*q)[:len(*q)-1]
	return x
}
func (q *littleQueue) Len() int           { return len(*q) }
func (q *littleQueue) Less(i, j int) bool { return (*q)[i].step < (*q)[j].step }
func (q *littleQueue) Swap(i, j int)      { (*q)[i], (*q)[j] = (*q)[j], (*q)[i] }

func shortestPathAllKeys2(grid []string) int {
	location := make(map[byte]pointTT)
	// 小根堆，用于Djikastra算法
	pq := make(littleQueue, 0, 1)
	// 距离矩阵，保存每个点到其他关键点的距离
	distMaps := make(map[byte]map[byte]int)
	heap.Init(&pq)
	for i := 0; i < len(grid); i++ {
		for j := 0; j < len(grid[0]); j++ {
			ch := grid[i][j]
			if ch != '.' && ch != '#' {
				p := pointTT{j, i, 0, 0}
				location[ch] = p
				distMaps[ch] = bpfFrom(p, grid)
			}
			if ch == '@' {
				heap.Push(&pq, pointTT{j, i, 0, 0})
			}
		}
	}
	keyNums := len(location) / 2
	finalState := (1 << keyNums) - 1

	finalDistMap := make(map[string]int)
	finalDistMap[fmt.Sprintf("%c%d", '@', 0)] = 0

	// Dijkstra算法
	for pq.Len() > 0 {
		// 每次取队列中最小的距离
		p := heap.Pop(&pq).(pointTT)
		// finalState还是队列中最小的步数，说明已经到了最小的步数
		if p.state == finalState {
			return p.step
		}
		// 从此点开始走，找到所有关键点
		ch := grid[p.y][p.x]
		distMap := distMaps[ch]
		for i, v := range distMap {
			state := p.state
			if i >= 'A' && i <= 'Z' {
				// 走到锁，判断是否可以走，不可以走就不走
				if (state & (1 << (i - 'A'))) == 0 {
					continue
				}
			} else if i >= 'a' && i <= 'z' {
				// 走到钥匙，拿起钥匙
				state |= (1 << (i - 'a'))
			}
			// 能走的点，如果没到达过，或者到达过但比之前距离更短，才加入队列
			t := location[i]
			t.state = state
			t.step = p.step + v
			key := fmt.Sprintf("%c%d", i, state)
			if d, ok := finalDistMap[key]; ok && t.step >= d {
				continue
			}
			finalDistMap[key] = t.step
			heap.Push(&pq, t)
		}
	}
	return -1
}

func bpfFrom(src pointTT, grid []string) map[byte]int {
	result := make(map[byte]int)
	sx, sy := src.x, src.y
	// 减小计算量，走过的路不再走，记录一下哪里走过了
	seen := make([][]bool, len(grid))
	for i := range seen {
		seen[i] = make([]bool, len(grid[0]))
	}
	seen[sy][sx] = true

	var queue list.List
	queue.PushBack(src)
	for queue.Len() > 0 {
		t := queue.Front().Value.(pointTT)
		queue.Remove(queue.Front())

		// 向四周走一次
		for i := range kRoundPoints {
			px, py := t.x+kRoundPoints[i][0], t.y+kRoundPoints[i][1]
			// 如果超出边界或者碰到墙或者走过了，就继续
			if py < 0 || py >= len(grid) || px < 0 || px >= len(grid[0]) || seen[py][px] || grid[py][px] == '#' {
				continue
			}
			// 判断是否是空位，空位就继续走
			seen[py][px] = true
			ch := grid[py][px]
			if ch == '.' {
				// 记录到队列中，作为下一层的点
				queue.PushBack(pointTT{px, py, t.step + 1, 0})
				continue
			}
			// 关键点插入map，这个时候还没走上去，所以步数+1才走上去
			result[ch] = t.step + 1
		}
	}
	return result
}
```
