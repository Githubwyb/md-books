---
title: "rbtree 红黑树"
---

```cpp
// include/linux/rbtree.h
struct rb_node {
	unsigned long  __rb_parent_color;
	struct rb_node *rb_right;
	struct rb_node *rb_left;
} __attribute__((aligned(sizeof(long))));
```

- 先参考 [地址对齐](https://githubwyb.github.io/blogs/2022-06-06-computer-composition/#1-地址对齐) 了解为什么可以使用`__rb_parent_color`的低两位作为颜色
