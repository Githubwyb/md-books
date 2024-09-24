---
title: "list 链表"
---

# 一、前言

内核里面链表的实现有很多种

| 名称                                | 用途                             | 定义                         |
| ----------------------------------- | -------------------------------- | ---------------------------- |
| list_head                           | 双向链表                         | `include/linux/types.h`      |
| hlist_head & hlist_node             | 带头节点的双向链表               | `include/linux/types.h`      |
| hlist_bl_head & hlist_bl_node       | 带自旋锁和头节点的双向链表       | `include/linux/list_bl.h`    |
| hlist_nulls_head & hlist_nulls_node | 使用ptr最后一位代表end的双向链表 | `include/linux/list_nulls.h` |

# 二、使用实例

## 1. 在链表中间插入

```cpp
void test() {
	// 按照到期时间排序插入
    struct TIMER *node;
    struct TIMER *prev = NULL;  // 记录要插入的节点前一个的节点

    hlist_for_each_entry(node, &s_timer_list, entry) {
        if (node->expires > timer->expires) {
            break;
        }
        prev = node;
    }
    if (prev == NULL) {
        // 没有前一个节点，说明要插入到第一个
        // 1. 有节点，但是都不满足条件，插入最前面
        // 2. 没有节点，直接插入最前面
        hlist_add_head(&timer->entry, &s_timer_list);
    } else {
        // 有前一个节点，插入到前一个节点后面
        hlist_add_behind(&timer->entry, &prev->entry);
    }
}
```

# 三、代码实现详解

## 3. `hlist_bl_head & hlist_bl_node` 带自旋锁和头节点的双向链表

和hlist实现差不多，定义都一样，但是在`hlist_bl_head->first`中取了第一位作为自旋锁。原因自然是因为字节对齐的问题，内核里面最差也是4字节对齐，就算16位也是2字节对齐，指针的最后一位都是0，所以最后一位可以拿来作为自旋锁。下面讲一些和hlist不一样的使用

定义如下

```cpp
static inline void hlist_bl_lock(struct hlist_bl_head *b)
{
	bit_spin_lock(0, (unsigned long *)b);
}

static inline void hlist_bl_unlock(struct hlist_bl_head *b)
{
	__bit_spin_unlock(0, (unsigned long *)b);
}
```

自旋锁使用`hlist_bl_head`作为地址设置第0位，写的比较隐晦，实际修改的是`first`，因为`struct hlist_bl_head`就只有一个元素

```cpp
struct hlist_bl_head {
	struct hlist_bl_node *first;
};
```

由于first最后一位被使用了，所以所有取first的地方都要做特殊处理

```cpp
// 取first真实地址需要将锁的位排除掉
static inline struct hlist_bl_node *hlist_bl_first(struct hlist_bl_head *h)
{
	return (struct hlist_bl_node *)
		((unsigned long)h->first & ~LIST_BL_LOCKMASK);
}

// 设置first时必须要加锁的状态
static inline void hlist_bl_set_first(struct hlist_bl_head *h,
					struct hlist_bl_node *n)
{
	LIST_BL_BUG_ON((unsigned long)n & LIST_BL_LOCKMASK);
	LIST_BL_BUG_ON(((unsigned long)h->first & LIST_BL_LOCKMASK) !=
							LIST_BL_LOCKMASK);
	h->first = (struct hlist_bl_node *)((unsigned long)n | LIST_BL_LOCKMASK);
}
```
