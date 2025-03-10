---
title: "kmem_cache"
---

- https://www.cnblogs.com/binlovetech/p/17434311.html
- https://blog.csdn.net/xixihahalelehehe/article/details/118567692
- https://blog.51cto.com/leejia/1431756
- https://fivezh.github.io/2017/06/25/Linux-slab-info/
- https://www.dingmos.com/index.php/archives/23/
- https://blog.csdn.net/juS3Ve/article/details/79285745
- https://www.cnblogs.com/binlovetech/p/17288990.html
- https://www.cnblogs.com/yinsedeyinse/p/16468553.html
- https://zhuanlan.zhihu.com/p/166649492
- https://blog.csdn.net/lqy971966/article/details/119801912
- https://stackoverflow.com/questions/22370102/difference-between-kmalloc-and-kmem-cache-alloc
- https://blog.csdn.net/dongyoubin/article/details/127816671

# 一、前言

kmem_cache是slab管理器，每一个slab都是由kmem_cache进行管理的。`struct kmem_cache`有三种定义，SLAB、SLUB、SLOB。内核在高版本已经使用SLUB，当前介绍一下SLUB定义的kmem_cache相关原理，另外两个是类似的实现。

```
SLAB是基础，SLOB用于嵌入式的小内存管理，SLUB是SLAB的改进版
```

# 二、实例

## 1. 使用kmem_cache定义一个hash表，管理用户态设置内存

```cpp
// 定义kmem_cache的slab
struct kmem_cache *toa_ipv6_node_slab = NULL;
// toa的ipv6表
SDP_DEFINE_HASHTABLE_BL(toa_ipv6_table, TOA_IPV6_HASH_BITS);

#ifdef DEBUG
#define TOA_IPV6_SLAB_FLAG (SLAB_RED_ZONE | SLAB_POISON | SLAB_STORE_USER | SLAB_CONSISTENCY_CHECKS)
#else
#define TOA_IPV6_SLAB_FLAG 0
#endif

// 初始化kmemcache
static int init_toa_ipv6_slab(void) {
    static const char *tag = __FUNCTION__;
	// 定义的是使用struct toa_ipv6_node的对应大小，后面malloc就是这个大小
    toa_ipv6_node_slab = KMEM_CACHE(toa_ipv6_node, TOA_IPV6_SLAB_FLAG);
    if (toa_ipv6_node_slab == NULL) {
        LOG_ERR("%s, create slab failed, maybe out of memory", tag);
        return -1;
    }
    return 0;
}

// 仅允许驱动卸载调用，里面会清理hash表，不加锁
static void uninit_toa_ipv6_slab(void) {
    static const char *tag = __FUNCTION__;
    int idx;
    int count = 0;
    struct hlist_bl_node *tmp = NULL;
    struct hlist_bl_node *node = NULL;
    toa_ipv6_node_t *entry = NULL;

    BUG_ON(!toa_ipv6_node_slab);

	// kmem_cache在销毁slab前需要将所有的slab回收掉才行
    hash_for_each_safe_bl(toa_ipv6_table, idx, tmp, node, entry, list) {
        hlist_bl_del(node);
        kmem_cache_free(toa_ipv6_node_slab, entry);
        ++count;
    }
    LOG_INFO("%s, there are %d ipv6 nodes not freed", tag, count);

    kmem_cache_destroy(toa_ipv6_node_slab);
    toa_ipv6_node_slab = NULL;
}

// 使用
void test(void) {
	struct toa_ipv6_node *node = NULL;
	node = kmem_cache_zalloc(toa_ipv6_node_slab, GFP_KERNEL);
	// do something
}
```

# 三、代码原理

## 1. 先解释一下`struct kmem_cache`

```cpp
// include/linux/slub_def.h
/*
 * Slab cache management.
 */
struct kmem_cache {
	// 每个cpu的私有数据，用于特定场景的快速申请和释放
	struct kmem_cache_cpu __percpu *cpu_slab;

	/* Used for retrieving partial slabs, etc. */
	// 记录分配时要设置的flags
	// SLAB_CONSISTENCY_CHECKS 用于检查内存分配器（slab 分配器）的内部一致性，启用这个选项可以帮助开发人员检测和诊断内存管理中的错误和不一致问题
	//    - 内存块完整性
	//    - 内存池状态
	//    - 边界检查
	//    - 双重释放
	// SLAB_RED_ZONE 		用于在缓存中划分红色区域，以检测内存越界等问题
	// SLAB_POISON 			用于填充对象以防止使用未初始化的内存或检出内存越界访问
	// SLAB_HWCACHE_ALIGN 	用于将对象对齐到缓存行，以提高缓存命中率和性能
	// SLAB_CACHE_DMA		对应于使用GFP_DMA
	// SLAB_CACHE_DMA32		对应于使用GFP_DMA32
	// SLAB_STORE_USER		用于存储最后的使用者信息，帮助在调试过程中追踪内存使用
	// SLAB_PANIC			函数调用失败时触发panic，从而中止系统运行，这是为了确保系统不会在内存分配错误后继续运行，导致更严重的问题
	slab_flags_t flags;

	// kmem_cache_shrink进行内存缩减时，要保留的最小的值。由函数set_min_partial(s, ilog2(s->size)/2)设置
	unsigned long min_partial;

	// object的实际大小，包含对齐
	unsigned int size;	/* The size of an object including metadata */
	// object的payload大小，数据结构实际使用的大小
	unsigned int object_size;/* The size of an object without metadata */


	struct reciprocal_value reciprocal_size;
	unsigned int offset;	/* Free pointer offset */
#ifdef CONFIG_SLUB_CPU_PARTIAL
	/* Number of per cpu partial objects to keep around */
	unsigned int cpu_partial;
	/* Number of per cpu partial slabs to keep around */
	unsigned int cpu_partial_slabs;
#endif
	struct kmem_cache_order_objects oo;

	/* Allocation and freeing of slabs */
	struct kmem_cache_order_objects min;
	gfp_t allocflags;	/* gfp flags to use on each alloc */
	int refcount;		/* Refcount for slab cache destroy */
	void (*ctor)(void *);
	unsigned int inuse;		/* Offset to metadata */
	unsigned int align;		/* Alignment */
	unsigned int red_left_pad;	/* Left redzone padding size */
	const char *name;	/* Name (only for display!) */
	struct list_head list;	/* List of slab caches */
#ifdef CONFIG_SYSFS
	struct kobject kobj;	/* For sysfs */
#endif
#ifdef CONFIG_SLAB_FREELIST_HARDENED
	unsigned long random;
#endif

#ifdef CONFIG_NUMA
	/*
	 * Defragmentation by allocating from a remote node.
	 */
	unsigned int remote_node_defrag_ratio;
#endif

#ifdef CONFIG_SLAB_FREELIST_RANDOM
	unsigned int *random_seq;
#endif

#ifdef CONFIG_KASAN
	struct kasan_cache kasan_info;
#endif

	unsigned int useroffset;	/* Usercopy region offset */
	unsigned int usersize;		/* Usercopy region size */

	struct kmem_cache_node *node[MAX_NUMNODES];
};
```
