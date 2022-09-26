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
class FileMonitor final {
public:
    explicit FileMonitor(std::string path) : m_filePath(std::move(path)) {}

    ~FileMonitor() { stop(); }

    void start() {
        stop();
        std::promise<void> p;
        m_monitorFuture = std::make_shared<std::future<void>>(std::async(std::launch::async, [&p, this]() {
            p.set_value();
            std::string tag = "file(" + m_filePath + ") monitor loop";
            LOGI(WHAT("{} begin", tag));

            {
                std::lock_guard<std::mutex> lock(m_fdMutex);
                // 设置为非阻塞方式
                m_monitorFD = inotify_init1(IN_NONBLOCK);
                if (m_monitorFD < 0) {
                    LOGE(WHAT("{} failed", tag),
                         REASON("inotify_init failed, ec: {}",
                                std::to_string(std::error_code(errno, std::system_category()))),
                         WILL("exit thread and won't watch file"));
                    return;
                }
            }

            // 添加文件监听的函数，返回false说明总的文件描述符被关闭
            if (!addFileWatch()) {
                LOGI(WHAT("{}, stop monitor", tag));
                return;
            }

            // 开始监听文件
            while (true) {
                char buf[sizeof(struct inotify_event) + m_filePath.size() + 1] = {0};
                ssize_t len;
                {
                    std::lock_guard<std::mutex> lock(m_fdMutex);
                    if (m_monitorFD < 0 || m_watchFD < 0) {
                        // 这里说明外部关闭了监听fd，也就是析构了，退出就好
                        break;
                    }
                    // 非阻塞读取event事件
                    len = read(m_monitorFD, buf, sizeof(buf));
                }
                if (len < 0) {
                    auto err = errno;
                    // 非阻塞的读不到事件返回EAGAIN，直接continue，其他的报错continue
                    if (err != EAGAIN) {
                        LOGW(WHAT("{}, read get err", tag),
                             REASON("get error {}", std::to_string(std::error_code(err, std::system_category()))),
                             WILL("retry after 10 ms"));
                    }
                    std::this_thread::sleep_for(std::chrono::milliseconds(10));
                    continue;
                }

                if (len < sizeof(struct inotify_event)) {
                    LOGW(WHAT("{}, read len error", tag), REASON("len {}, need {}", len, sizeof(struct inotify_event)),
                         WILL("retry after 10 ms"));
                    std::this_thread::sleep_for(std::chrono::milliseconds(10));
                    continue;
                }

                int index = 0;
                bool isChanged = false;
                // 这里怕读到多个事件，使用while处理
                do {
                    auto event = reinterpret_cast<struct inotify_event *>(buf + index);
                    // index向后移动evnet和name的长度
                    index += sizeof(struct inotify_event) + event->len;
                    LOGD(WHAT("event wd {}, mask {}, cookie {}, len {}, name {}", event->wd, event->mask, event->cookie,
                              event->len, event->name));
                    {
                        std::lock_guard<std::mutex> lock(m_fdMutex);
                        if (event->wd != m_watchFD) {
                            continue;
                        }
                    }
                    // 老的句柄被移除后，这里read会有一次ignore
                    if (event->mask & (IN_IGNORED)) {
                        continue;
                    }

                    // 到这里说明文件存在改动
                    isChanged = true;

                    // 这个文件被删除或重命名，需要重新进行添加
                    if (event->mask & (IN_DELETE_SELF | IN_MOVE_SELF)) {
                        LOGI(WHAT("{}, file {} was renamed or deleted, retry open", tag, m_filePath));
                        if (!addFileWatch()) {
                            LOGI(WHAT("{}, stop monitor", tag));
                            return;
                        }
                    }

                } while (index < len);

                if (isChanged) {
                    // 文件发生变化
                    LOGI(WHAT("{}, file change", tag));
                    notifyChangeCallback();
                }
            }

            LOGI(WHAT("{} end", tag));
            {
                std::lock_guard<std::mutex> lock(m_fdMutex);
                if (m_monitorFD >= 0) {
                    if (m_watchFD >= 0) {
                        inotify_rm_watch(m_monitorFD, m_watchFD);
                        m_watchFD = -1;
                    }
                    close(m_monitorFD);
                    m_monitorFD = -1;
                }
            }
        }));
        p.get_future().wait();
    }

    void stop() {
        if (m_monitorFuture == nullptr || !m_monitorFuture->valid()) {
            return;
        }
        do {
            // 这里将总的fd关闭，将线程从read阻塞释放出来，然后将watch移除
            std::lock_guard<std::mutex> lock(m_fdMutex);
            if (m_monitorFD >= 0) {
                if (m_watchFD >= 0) {
                    inotify_rm_watch(m_monitorFD, m_watchFD);
                    m_watchFD = -1;
                }
                close(m_monitorFD);
                m_monitorFD = -1;
            }
            // 可能还没打开就关闭了，这里确保一下future是正常的，防止死锁
        } while (m_monitorFuture->wait_for(std::chrono::milliseconds(1)) != std::future_status::ready);
        m_monitorFuture = nullptr;
    }

    /**
     * @brief 是否正在监控
     * @return
     */
    bool isRunning() { return m_monitorFuture != nullptr; }

    /**
     * @brief 添加文件变化回调
     * @param callback
     */
    void registerChangeCallback(const std::function<void()> &callback) {
        std::lock_guard<std::mutex> lock(m_callbackMutex);
        m_callbacks.emplace_back(callback);
    }

    /**
     * @brief 移除文件变化回调
     * @param callback
     */
    void unregisterChangeCallback(std::function<void()> callback) {
        std::lock_guard<std::mutex> lock(m_callbackMutex);
        for (auto it = m_callbacks.begin(); it != m_callbacks.end(); ++it) {
            if (it->target<void *>() == callback.target<void *>()) {
                m_callbacks.erase(it);
                break;
            }
        }
    }

private:
    std::string m_filePath;
    std::shared_ptr<std::future<void>> m_monitorFuture;
    std::mutex m_fdMutex;
    int m_monitorFD = -1;                            // inotify的句柄
    int m_watchFD = -1;                              // 被添加的文件句柄
    std::mutex m_callbackMutex;                      // 对回调函数加锁
    std::vector<std::function<void()>> m_callbacks;  // 回调函数

    /**
     * @brief 通知变更的观察者，此文件变更
     */
    void notifyChangeCallback() {
        std::vector<std::function<void()>> callbacks;
        {
            std::lock_guard<std::mutex> lock(m_callbackMutex);
            callbacks = m_callbacks;
        }
        for (auto &callback : callbacks) {
            callback();
        }
    }

    /**
     * @brief 添加一个文件到列表中
     *
     * @return 添加成功还是失败
     */
    bool addFileWatch() {
        std::string tag = "add file(" + m_filePath + ") to watch";
        {
            std::lock_guard<std::mutex> lock(m_fdMutex);
            if (m_monitorFD < 0) {
                return false;
            }
            // 关闭上一次的句柄
            if (m_watchFD >= 0) {
                LOGI(WHAT("{}, remove watch fd {}", tag, m_watchFD));
                inotify_rm_watch(m_monitorFD, m_watchFD);
                m_watchFD = -1;
            }
        }
        uint32_t failedCount = 0;
        // 最大重试32位最大值的次数
        while (++failedCount) {
            // 重新加锁判断是否monitor已经被关了
            {
                std::lock_guard<std::mutex> lock(m_fdMutex);
                if (m_monitorFD < 0) {
                    // 这里说明外部关闭了监听fd，也就是析构了，退出就好
                    return false;
                }
                // 监听所有事件，除了访问，打开和关闭，主要监听修改删除，添加成功直接返回
                m_watchFD = inotify_add_watch(m_monitorFD, m_filePath.c_str(),
                                              IN_ALL_EVENTS ^ (IN_ACCESS | IN_OPEN | IN_CLOSE));
                if (m_watchFD > 0) {
                    LOGI(WHAT("{}, add watch success, fd {}", tag, m_watchFD));
                    return true;
                }
            }
            if ((failedCount % 100) == 1) {
                LOGW(WHAT("{}, inotify_add_watch failed", tag),
                     REASON("failed {} times, ec: {}", failedCount,
                            std::to_string(std::error_code(errno, std::system_category()))),
                     WILL("retry"));
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
        LOGE(WHAT("{} failed", tag),
             REASON("reach max failed count {}, ec: {}", failedCount - 1, m_filePath,
                    std::to_string(std::error_code(errno, std::system_category()))),
             WILL("stop watch file"));
        return false;
    }
};
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
