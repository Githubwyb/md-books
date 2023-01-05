---
weight: 2502
title: "2502. Longest Square Streak in an Array"
---

# 题目

You are given an integer n representing the size of a 0-indexed memory array. All memory units are initially free.

You have a memory allocator with the following functionalities:

1. Allocate a block of size consecutive free memory units and assign it the id mID.
2. Free all memory units with the given id mID.

Note that:

- Multiple blocks can be allocated to the same mID.
- You should free all the memory units with mID, even if they were allocated in different blocks.

Implement the Allocator class:

- `Allocator(int n)` Initializes an Allocator object with a memory array of size n.
- `int allocate(int size, int mID)` Find the leftmost block of size consecutive free memory units and allocate it with the id mID. Return the block's first index. If such a block does not exist, return -1.
- `int free(int mID)` Free all memory units with the id mID. Return the number of memory units you have freed.
 

Example 1:

```
Input
["Allocator", "allocate", "allocate", "allocate", "free", "allocate", "allocate", "allocate", "free", "allocate", "free"]
[[10], [1, 1], [1, 2], [1, 3], [2], [3, 4], [1, 1], [1, 1], [1], [10, 2], [7]]
Output
[null, 0, 1, 2, 1, 3, 1, 6, 3, -1, 0]

Explanation
Allocator loc = new Allocator(10); // Initialize a memory array of size 10. All memory units are initially free.
loc.allocate(1, 1); // The leftmost block's first index is 0. The memory array becomes [1,_,_,_,_,_,_,_,_,_]. We return 0.
loc.allocate(1, 2); // The leftmost block's first index is 1. The memory array becomes [1,2,_,_,_,_,_,_,_,_]. We return 1.
loc.allocate(1, 3); // The leftmost block's first index is 2. The memory array becomes [1,2,3,_,_,_,_,_,_,_]. We return 2.
loc.free(2); // Free all memory units with mID 2. The memory array becomes [1,_, 3,_,_,_,_,_,_,_]. We return 1 since there is only 1 unit with mID 2.
loc.allocate(3, 4); // The leftmost block's first index is 3. The memory array becomes [1,_,3,4,4,4,_,_,_,_]. We return 3.
loc.allocate(1, 1); // The leftmost block's first index is 1. The memory array becomes [1,1,3,4,4,4,_,_,_,_]. We return 1.
loc.allocate(1, 1); // The leftmost block's first index is 6. The memory array becomes [1,1,3,4,4,4,1,_,_,_]. We return 6.
loc.free(1); // Free all memory units with mID 1. The memory array becomes [_,_,3,4,4,4,_,_,_,_]. We return 3 since there are 3 units with mID 1.
loc.allocate(10, 2); // We can not find any free block with 10 consecutive free memory units, so we return -1.
loc.free(7); // Free all memory units with mID 7. The memory array remains the same since there is no memory unit with mID 7. We return 0.
```
 
Constraints:

- 1 <= n, size, mID <= 1000
- At most 1000 calls will be made to allocate and free.

# 思路1

## 分析

- 就是设计一个内存池，删除全部清理，分配取最左侧匹配的
- 使用一个链表存储所有已分配内存，取第一个和最后一个为边界
- 再使用一个map存储清理时的mID对应在链表的迭代器

## 代码

```go
type mem struct {
	start int
	end   int // end不属于范围
	mID   int
}

type Allocator struct {
	memMap  *list.List
	freeMap map[int][]*list.Element
}

func Constructor(n int) Allocator {
	res := Allocator{}
	res.memMap = list.New()
	// 放一个头节点进去
	res.memMap.PushFront(mem{
		start: 0,
		end:   0,
		mID:   -1,
	})
	// 放一个尾节点进去
	res.memMap.PushBack(mem{
		start: n,
		end:   n,
		mID:   -1,
	})
	res.freeMap = make(map[int][]*list.Element)
	fmt.Printf("init %p\r\n", &(res.memMap))
	return res
}

func (this *Allocator) Allocate(size int, mID int) int {
	// 从第一个开始找所有间隔是否有空位
	p := this.memMap.Front()
	for n := p.Next(); n != nil; p, n = n, n.Next() {
		if n.Value.(mem).start-p.Value.(mem).end < size {
			continue
		}
		start := p.Value.(mem).end
		fmt.Printf("insert %p\r\n", &(this.memMap))
		this.memMap.InsertAfter(mem{
			start: start,
			end:   start + size,
			mID:   mID,
		}, p)
		if _, ok := this.freeMap[mID]; !ok {
			this.freeMap[mID] = make([]*list.Element, 0, 1)
		}
		this.freeMap[mID] = append(this.freeMap[mID], p.Next())
		return start
	}
	return -1
}

func (this *Allocator) Free(mID int) int {
	ans := 0
	if idMap, ok := this.freeMap[mID]; ok {
		for _, v := range idMap {
			ans += v.Value.(mem).end - v.Value.(mem).start
			this.memMap.Remove(v)
		}
		this.freeMap[mID] = this.freeMap[mID][:0]
	}
	return ans
}

/**
 * Your Allocator object will be instantiated and called as such:
 * obj := Constructor(n);
 * param_1 := obj.Allocate(size,mID);
 * param_2 := obj.Free(mID);
 */
```
