---
weight: 3
---

- 参考[从linux5.9看网络层的设计](https://mp.weixin.qq.com/s/OmRdUgO1guMX76EdZn11UQ)

### 1.1. epoll

- epoll对于fd的储存使用的是红黑树
- 使用链表保存处于就绪状态的fd

#### 1) 接口定义

```cpp
// fs/eventpoll.c
SYSCALL_DEFINE1(epoll_create, int, size)
{
	if (size <= 0)
		return -EINVAL;

	return do_epoll_create(0);
}

/*
 * The following function implements the controller interface for
 * the eventpoll file that enables the insertion/removal/change of
 * file descriptors inside the interest set.
 */
SYSCALL_DEFINE4(epoll_ctl, int, epfd, int, op, int, fd,
		struct epoll_event __user *, event)
{
	struct epoll_event epds;

	if (ep_op_has_event(op) &&
	    copy_from_user(&epds, event, sizeof(struct epoll_event)))
		return -EFAULT;

	return do_epoll_ctl(epfd, op, fd, &epds, false);
}

SYSCALL_DEFINE4(epoll_wait, int, epfd, struct epoll_event __user *, events,
		int, maxevents, int, timeout)
{
	struct timespec64 to;

	return do_epoll_wait(epfd, events, maxevents,
			     ep_timeout_to_timespec(&to, timeout));
}
```

#### 2) 数据结构

```cpp

```
