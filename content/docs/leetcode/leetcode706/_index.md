---
weight: 706
title: "706. Design HashMap"
---

# 题目

Design a HashMap without using any built-in hash table libraries.

Implement the MyHashMap class:

- `MyHashMap()` initializes the object with an empty map.
- `void put(int key, int value)` inserts a (key, value) pair into the HashMap. If the key already exists in the map, update the corresponding value.
- `int get(int key)` returns the value to which the specified key is mapped, or -1 if this map contains no mapping for the key.
- `void remove(key)` removes the key and its corresponding value if the map contains the mapping for the key.


# 思路1

## 分析

- key是int的hashMap，那不是直接初始化一个int大小的数组，直接索引就好了
- 没值的是-1，那就直接初始化为-1
- 尝试出来最大的key是`1000000`，那就直接上代码

## 代码实现

```go
package main

type MyHashMap struct {
	data []int
}

func Constructor() (this MyHashMap) {
	this.data = make([]int, 1e6 + 1)
	for i := range this.data {
		this.data[i] = -1
	}
	return
}

func (this *MyHashMap) Put(key int, value int) {
	this.data[key] = value
}

func (this *MyHashMap) Get(key int) int {
	return this.data[key]
}

func (this *MyHashMap) Remove(key int) {
	this.data[key] = -1
}

/**
 * Your MyHashMap object will be instantiated and called as such:
 * obj := Constructor();
 * obj.Put(key,value);
 * param_2 := obj.Get(key);
 * obj.Remove(key);
 */
```

# 思路2

## 分析

- 上面方法纯属搞笑，忽略即可，只是因为思维局限在使用数组实现hash，嫌数组实现链表太麻烦不想写，没有想到可以直接使用链表
- 正常hashMap使用数组和链表进行实现
- 除数使用素数，找了个1000以内的最大素数也就是997

## 代码实现

```go
package main

import (
	"container/list"
)

const base = 997

type dataT struct {
	key   int
	value int
}

type MyHashMap struct {
	data []list.List
}

func Constructor1() (this MyHashMap) {
	this.data = make([]list.List, base, base)
	return
}

func (this *MyHashMap) Put(key int, value int) {
	h := key % base
	for e := this.data[h].Front(); e != nil; e = e.Next() {
		if et := e.Value.(dataT); et.key == key {
			e.Value = dataT{key, value}
			return
		}
	}
	this.data[h].PushBack(dataT{key, value})
}

func (this *MyHashMap) Get(key int) int {
	h := key % base
	for e := this.data[h].Front(); e != nil; e = e.Next() {
		if et := e.Value.(dataT); et.key == key {
			return et.value
		}
	}
	return -1
}

func (this *MyHashMap) Remove(key int) {
	h := key % base
	for e := this.data[h].Front(); e != nil; e = e.Next() {
		if et := e.Value.(dataT); et.key == key {
			this.data[h].Remove(e)
			return
		}
	}
}

/**
 * Your MyHashMap object will be instantiated and called as such:
 * obj := Constructor();
 * obj.Put(key,value);
 * param_2 := obj.Get(key);
 * obj.Remove(key);
 */
```
