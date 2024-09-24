---
title: "hashtable 哈希表"
---

# 一、前言

内核里面实现哈希表很简单粗暴，使用一个数组作为hash查找，每一个元素里面就是一个链表。

# 二、示例

## 1. 内核标准实现

```cpp
#include <linux/hashtable.h>
#include <linux/printk.h>

// 定义2^3的hash表，也就是8个桶
DEFINE_HASHTABLE(test_hash_table, 3);

typedef struct test_hash_node {
    struct hlist_node list;
    int key;
    int value;
} test_hash_node_t;

void test_hash(void) {
    test_hash_node_t item[10];
    test_hash_node_t *entry;
    size_t i;
    int key;

    // DEFINE_HASHTABLE定义的不用初始化
    // DECLARE_HASHTABLE定义的一定要初始化，默认的table中的first可能没有清零，导致后面遍历崩掉
    // hash_init(test_hash_table);

    for (i = 0; i < 10; i++) {
        entry = &item[i];
        // 初始化node，也就是将两个指针清零
        INIT_HLIST_NODE(&entry->list);

        entry->key = i;
        entry->value = i;
        // 插入hash表
        hash_add(test_hash_table, &entry->list, entry->key);
    }

    // 查询
    key = 5;
    hash_for_each_possible(test_hash_table, entry, list, key) {
        if (entry->key == key) {
            printk("key: %d, value: %d\n", entry->key, entry->value);
        }
    }

    // 遍历所有的key
    hash_for_each(test_hash_table, i, entry, list) {
        printk("hash idx %ld, key: %d, value: %d\n", i, entry->key, entry->value);
    }
}
```

## 2. 使用hlist自定义实现

- 自定义实现可以自定义hash表长度、添加锁等操作，默认的hash表不能处理锁

```cpp
#include <linux/list.h>
#include <linux/printk.h>

#define TEST_HASH_SIZE 5

typedef struct test_hash_node {
    struct hlist_node list;
    int key;
    int value;
} test_hash_node_t;

typedef struct test_hashinfo {
    struct hlist_head hash[TEST_HASH_SIZE];
} test_hashinfo_t;

static inline int test_hash_fun(unsigned int key) {
    return key % TEST_HASH_SIZE;
}

void test_hash(void) {
    test_hashinfo_t table;
    test_hash_node_t item[10];
    test_hash_node_t *entry;
    struct hlist_head *head;
    size_t i;
    int key;

    // 一定要初始化，默认的table中的first可能没有清零，导致后面遍历崩掉
    for (i = 0; i < ARRAY_SIZE(table.hash); i++) {
        INIT_HLIST_HEAD(&table.hash[i]);
    }

    for (i = 0; i < 10; i++) {
        entry = &item[i];
        // 初始化node，也就是将两个指针清零
        INIT_HLIST_NODE(entry);

        entry->key = i;
        entry->value = i;
        // 插入hash表，找到hash对应的桶
        head = &table.hash[test_hash_fun(item[i]->key)];
        // 添加到hash桶的头部
        hlist_add_head(entry->list, head);
    }

    // 查询
    key = 5;
    // 先找到桶
    head = &table.hash[test_hash_fun(key)];
    // 遍历链表找到元素
    hlist_for_each_entry(entry, head, list) {
        if (entry->key == key) {
            printk("find key %d, value %d\n", entry->key, entry->value);
            break;
        }
    }
}
```

## 3. 使用hlist_bl自定义实现，每个桶一个自旋锁

```cpp
#include <linux/hashtable.h>
#include <linux/list_bl.h>
#include <linux/printk.h>

/********** 这一部分可以写到hashtable_bl.h中 start **********/
#define DEFINE_HASHTABLE_BL(name, bits) \
    struct hlist_bl_head name[1 << (bits)] = {[0 ...((1 << (bits)) - 1)] = HLIST_HEAD_INIT}

#define DEFINE_READ_MOSTLY_HASHTABLE_BL(name, bits) \
    struct hlist_bl_head name[1 << (bits)] __read_mostly = {[0 ...((1 << (bits)) - 1)] = HLIST_HEAD_INIT}

#define DECLARE_HASHTABLE_BL(name, bits) struct hlist_bl_head name[1 << (bits)]

static inline void __hash_init_bl(struct hlist_bl_head *ht, unsigned int sz) {
    unsigned int i;

    for (i = 0; i < sz; i++) INIT_HLIST_HEAD(&ht[i]);
}

#define hash_init_bl(hashtable) __hash_init_bl(hashtable, HASH_SIZE(hashtable))

// 获取key对应的头节点
#define hash_get_head(hashtable, key) (&hashtable[hash_min(key, HASH_BITS(hashtable))])

/**
 * hash_add - add an object to a hashtable
 * @hashtable: hashtable to add to
 * @node: the &struct hlist_node of the object to be added
 * @key: the key of the object to be added
 */
#define hash_add_bl(hashtable, node, key)                             \
    ({                                                                \
        struct hlist_bl_head *__mptr = hash_get_head(hashtable, key); \
        hlist_bl_lock(__mptr);                                        \
        hlist_bl_add_head(node, __mptr);                              \
        hlist_bl_unlock(__mptr);                                      \
    })

/**
 * hash_for_each_safe - iterate over a hashtable safe against removal of
 * hash entry
 * @name: hashtable to iterate
 * @bkt: integer to use as bucket loop cursor
 * @tmp: a &struct used for temporary storage
 * @pos: the &struct hlist_bl_node to use as a loop cursor.
 * @obj: the type * to use as a loop cursor for each entry
 * @member: the name of the hlist_node within the struct
 */
#define hash_for_each_safe_bl(name, bkt, tmp, pos, obj, member)   \
    for ((bkt) = 0, obj = NULL; (bkt) < HASH_SIZE(name); (bkt)++) \
    hlist_bl_for_each_entry_safe(obj, pos, tmp, &name[bkt], member)
/********** 这一部分可以写到hashtable_bl.h中 end **********/

// 定义链表元素节点
typedef struct test_hash_node {
    struct hlist_bl_node list;
    int key;
    int value;
} test_hash_node_t;

// 定义hash表
static DEFINE_HASHTABLE_BL(table, 10);  // 这里会自动初始化

void test_hash(void) {
    test_hash_node_t item[10];
    test_hash_node_t *entry;
    struct hlist_bl_head *head;
    struct hlist_bl_node *node;
    size_t i;
    int key;

    for (i = 0; i < 10; i++) {
        entry = &item[i];
        // 初始化node，也就是将两个指针清零
        INIT_HLIST_BL_NODE(&entry->list);

        entry->key = i;
        entry->value = i;
        // 插入hash表
        hash_add_bl(table, &entry->list, entry->key);
    }

    // 查询
    key = 5;
    head = hash_get_head(table, key);
    // 遍历链表找到元素
    hlist_bl_lock(head);
    hlist_bl_for_each_entry(entry, node, head, list) {
        if (entry->key == key) {
            printk("find key %d, value %d\n", entry->key, entry->value);
            break;
        }
    }
    hlist_bl_unlock(head);

    // 遍历所有table，不加锁清理
    hash_for_each_safe_bl(toa_ipv6_table, idx, tmp, node, entry, list) {
        hlist_bl_del(node);
    }
}
```
