---
weight: 1
title: "container_of() 根据成员地址找其所在结构体"
---

# 一、源码

```cpp
// include/linux/kernel.h

/**
 * container_of - cast a member of a structure out to the containing structure
 * @ptr:	the pointer to the member.
 * @type:	the type of the container struct this is embedded in.
 * @member:	the name of the member within the struct.
 *
 */
#define container_of(ptr, type, member) ({				\
	void *__mptr = (void *)(ptr);					\
	BUILD_BUG_ON_MSG(!__same_type(*(ptr), ((type *)0)->member) &&	\
			 !__same_type(*(ptr), void),			\
			 "pointer type mismatch in container_of()");	\
	((type *)(__mptr - offsetof(type, member))); })
```

# 二、分析

- 这个东西看了好久才看懂，不过真的很强大
- 考虑一个场景，我们定义树需要怎么写，类似下面这样

```cpp
struct treeNode {
  treeNode *left;
  treeNode *right;
  void *value;
};
```

- 这时发现这个value每次都要定义，并且每个treeNode都需要新建地址
- linux的这群大佬就开始搞事情，如果treeNode的地址和value的地址结合一下，不用每次创建两个地址，一个地址搞定
- 这时候就出现一种定义方式

```cpp
struct treeNode {
  treeNode *left;
  treeNode *right;
};

struct valueTemplate {
  treeNode node;
  int value;
}
```

- 这样写，对树操作时不用关心value是啥，只需要关心自己的数据结构实现就好了
- 但是怎么找到value呢，`container_of`就出现了

```cpp
#define container_of(ptr, type, member) \
    (type *)((char *)(ptr) - (char *) &((type *)0)->member)

// 示例用法
void func(treeNode *node) {
  valueTemplate *value = container_of(node, struct valueTemplate, node)
}
```

- 展开一下

```cpp
valueTemplate *value = (valueTemplate *)((char *)node  - (char *)&((valueTemplate *)0)->node)
```

- 加地址是向后偏移，减地址是向前偏移，所以这句话意思是通过成员变量找到结构体指针
- 使用0地址的成员变量的地址偏移来计算结构体指针到成员变量的偏移量，然后用成员变量地址向前偏移去查找value
- 这个想法是真的强大
