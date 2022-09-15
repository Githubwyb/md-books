# 一、介绍

## 1. 提供的系统调用

```cpp
SYSCALL_DEFINE1(inotify_init1, int, flags)
SYSCALL_DEFINE0(inotify_init)
SYSCALL_DEFINE3(inotify_add_watch, int, fd, const char __user *, pathname, u32, mask)
SYSCALL_DEFINE2(inotify_rm_watch, int, fd, __s32, wd)
```

## 2. 示例用法

```cpp

```

# 二、源码分析

## 1. inotify_init

- 都是调用`do_inotify_init`

```cpp
// fs/notify/inotify/inotify_user.c
SYSCALL_DEFINE1(inotify_init1, int, flags)
{
    return do_inotify_init(flags);
}

SYSCALL_DEFINE0(inotify_init)
{
    return do_inotify_init(0);
}
```

- `do_inotify_init`就是创建了一个fd，提供了一系列操作`inotify_fops`

```cpp
// fs/notify/inotify/inotify_user.c
/* inotify syscalls */
static int do_inotify_init(int flags)
{
    struct fsnotify_group *group;
    int ret;

    /* Check the IN_* constants for consistency.  */
    BUILD_BUG_ON(IN_CLOEXEC != O_CLOEXEC);
    BUILD_BUG_ON(IN_NONBLOCK != O_NONBLOCK);

    if (flags & ~(IN_CLOEXEC | IN_NONBLOCK))
        return -EINVAL;

    /* fsnotify_obtain_group took a reference to group, we put this when we kill the file in the end */
    group = inotify_new_group(inotify_max_queued_events);
    if (IS_ERR(group))
        return PTR_ERR(group);

    ret = anon_inode_getfd("inotify", &inotify_fops, group,
                O_RDONLY | flags);
    if (ret < 0)
        fsnotify_destroy_group(group);

    return ret;
}
```

- `inotify_ops`中重点关注read方法

```cpp
static const struct file_operations inotify_fops = {
    .show_fdinfo    = inotify_show_fdinfo,
    .poll       = inotify_poll,
    .read       = inotify_read,
    .fasync     = fsnotify_fasync,
    .release    = inotify_release,
    .unlocked_ioctl = inotify_ioctl,
    .compat_ioctl   = inotify_ioctl,
    .llseek     = noop_llseek,
};
```

## 2. read调用发生了什么

- read出来是`inotify_event`结构体，最后的name不确定长度

```cpp
/*
 * struct inotify_event - structure read from the inotify device for each event
 *
 * When you are watching a directory, you will receive the filename for events
 * such as IN_CREATE, IN_DELETE, IN_OPEN, IN_CLOSE, ..., relative to the wd.
 */
struct inotify_event {
	__s32		wd;		/* watch descriptor */
	__u32		mask;		/* watch mask */
	__u32		cookie;		/* cookie to synchronize two events */
	__u32		len;		/* length (including nulls) of name */
	char		name[0];	/* stub for possible name */
};
```

- `inotify_read`的处理就是外面调用read时调用的函数

```cpp
static ssize_t inotify_read(struct file *file, char __user *buf,
			    size_t count, loff_t *pos)
{
	struct fsnotify_group *group;
	struct fsnotify_event *kevent;
	char __user *start;
	int ret;
	DEFINE_WAIT_FUNC(wait, woken_wake_function);

	start = buf;
	group = file->private_data;

	add_wait_queue(&group->notification_waitq, &wait);
	while (1) {
		spin_lock(&group->notification_lock);
        // 从group中取一个event，count代表size
		kevent = get_one_event(group, count);
		spin_unlock(&group->notification_lock);

		pr_debug("%s: group=%p kevent=%p\n", __func__, group, kevent);

        // 存在event，拷贝到用户态内存中，然后销毁内核态event，count-=size
		if (kevent) {
			ret = PTR_ERR(kevent);
			if (IS_ERR(kevent))
				break;
			ret = copy_event_to_user(group, kevent, buf);
			fsnotify_destroy_event(group, kevent);
			if (ret < 0)
				break;
			buf += ret;
			count -= ret;
			continue;
		}

		ret = -EAGAIN;
		if (file->f_flags & O_NONBLOCK)
			break;
		ret = -ERESTARTSYS;
		if (signal_pending(current))
			break;

		if (start != buf)
			break;

		wait_woken(&wait, TASK_INTERRUPTIBLE, MAX_SCHEDULE_TIMEOUT);
	}
	remove_wait_queue(&group->notification_waitq, &wait);

	if (start != buf && ret != -EFAULT)
		ret = buf - start;
	return ret;
}
```

- `get_one_event`可以看到整体size包含`inotify_event`的size和name的长度
- 如果count满足整体size，就删除队列第一个并返回

```cpp
/*
 * Get an inotify_kernel_event if one exists and is small
 * enough to fit in "count". Return an error pointer if
 * not large enough.
 *
 * Called with the group->notification_lock held.
 */
static struct fsnotify_event *get_one_event(struct fsnotify_group *group,
					    size_t count)
{
	size_t event_size = sizeof(struct inotify_event);
	struct fsnotify_event *event;

    // 从group中取一个event，不删除list中的数据
	event = fsnotify_peek_first_event(group);
	if (!event)
		return NULL;

	pr_debug("%s: group=%p event=%p\n", __func__, group, event);

	event_size += round_event_name_len(event);
	if (event_size > count)
		return ERR_PTR(-EINVAL);

	/* held the notification_lock the whole time, so this is the
	 * same event we peeked above */
	fsnotify_remove_first_event(group);

	return event;
}
```

- `fsnotify_peek_first_event`，group中存有通知的链表，这里取第一个

```cpp
/*
 * Return the first event on the notification list without removing it.
 * Returns NULL if the list is empty.
 */
struct fsnotify_event *fsnotify_peek_first_event(struct fsnotify_group *group)
{
	assert_spin_locked(&group->notification_lock);

	if (fsnotify_notify_queue_is_empty(group))
		return NULL;

	return list_first_entry(&group->notification_list,
				struct fsnotify_event, list);
}
```
