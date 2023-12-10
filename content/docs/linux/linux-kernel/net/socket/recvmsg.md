---
weight: 3
title: "recvmsg"
---

# 一、总述

- recvmsg可以像普通的recv一样接收消息，也可以其他进程提供的文件句柄

# 二、代码流程

- 入口自然是系统调用的定义

```cpp
// net/socket.c
long __sys_recvmsg(int fd, struct user_msghdr __user *msg, unsigned int flags,
		   bool forbid_cmsg_compat)
{
	int fput_needed, err;
	struct msghdr msg_sys;
	struct socket *sock;

	if (forbid_cmsg_compat && (flags & MSG_CMSG_COMPAT))
		return -EINVAL;

	sock = sockfd_lookup_light(fd, &err, &fput_needed);
	if (!sock)
		goto out;

	err = ___sys_recvmsg(sock, msg, &msg_sys, flags, 0);

	fput_light(sock->file, fput_needed);
out:
	return err;
}

SYSCALL_DEFINE3(recvmsg, int, fd, struct user_msghdr __user *, msg,
		unsigned int, flags)
{
	return __sys_recvmsg(fd, msg, flags, true);
}
```

- 继续到接收的地方

```cpp
// net/socket.c
static int ___sys_recvmsg(struct socket *sock, struct user_msghdr __user *msg,
			 struct msghdr *msg_sys, unsigned int flags, int nosec)
{
	struct iovec iovstack[UIO_FASTIOV], *iov = iovstack;
	/* user mode address pointers */
	struct sockaddr __user *uaddr;
	ssize_t err;

	err = recvmsg_copy_msghdr(msg_sys, msg, flags, &uaddr, &iov);
	if (err < 0)
		return err;

	err = ____sys_recvmsg(sock, msg_sys, msg, uaddr, flags, nosec);
	kfree(iov);
	return err;
}
```

- 最终调用对应套接字的接收函数上

```cpp
// net/socket.c
static int ____sys_recvmsg(struct socket *sock, struct msghdr *msg_sys,
			   struct user_msghdr __user *msg,
			   struct sockaddr __user *uaddr,
			   unsigned int flags, int nosec)
{
	struct compat_msghdr __user *msg_compat =
					(struct compat_msghdr __user *) msg;
	int __user *uaddr_len = COMPAT_NAMELEN(msg);
	struct sockaddr_storage addr;
	unsigned long cmsg_ptr;
	int len;
	ssize_t err;

	msg_sys->msg_name = &addr;
	cmsg_ptr = (unsigned long)msg_sys->msg_control;
	msg_sys->msg_flags = flags & (MSG_CMSG_CLOEXEC|MSG_CMSG_COMPAT);

	/* We assume all kernel code knows the size of sockaddr_storage */
	msg_sys->msg_namelen = 0;

	if (sock->file->f_flags & O_NONBLOCK)
		flags |= MSG_DONTWAIT;

	// 这里从socket中接收数据
	if (unlikely(nosec))
		err = sock_recvmsg_nosec(sock, msg_sys, flags);
	else
		err = sock_recvmsg(sock, msg_sys, flags);

	if (err < 0)
		goto out;
	len = err;

	if (uaddr != NULL) {
		err = move_addr_to_user(&addr,
					msg_sys->msg_namelen, uaddr,
					uaddr_len);
		if (err < 0)
			goto out;
	}
	err = __put_user((msg_sys->msg_flags & ~MSG_CMSG_COMPAT),
			 COMPAT_FLAGS(msg));
	if (err)
		goto out;
	// 兼容64位和32位，拷贝内核空间数据到用户空间
	if (MSG_CMSG_COMPAT & flags)
		err = __put_user((unsigned long)msg_sys->msg_control - cmsg_ptr,
				 &msg_compat->msg_controllen);
	else
		err = __put_user((unsigned long)msg_sys->msg_control - cmsg_ptr,
				 &msg->msg_controllen);
	if (err)
		goto out;
	err = len;
out:
	return err;
}

// net/socket.c
/**
 *	sock_recvmsg - receive a message from @sock
 *	@sock: socket
 *	@msg: message to receive
 *	@flags: message flags
 *
 *	Receives @msg from @sock, passing through LSM. Returns the total number
 *	of bytes received, or an error.
 */
int sock_recvmsg(struct socket *sock, struct msghdr *msg, int flags)
{
	int err = security_socket_recvmsg(sock, msg, msg_data_left(msg), flags);

	return err ?: sock_recvmsg_nosec(sock, msg, flags);
}
EXPORT_SYMBOL(sock_recvmsg);
```

## unix套接字

### dgram udp的接收

```cpp
// net/unix/af_unix.c
static int unix_dgram_recvmsg(struct socket *sock, struct msghdr *msg, size_t size,
			      int flags)
{
	struct sock *sk = sock->sk;

#ifdef CONFIG_BPF_SYSCALL
	const struct proto *prot = READ_ONCE(sk->sk_prot);

	if (prot != &unix_dgram_proto)
		return prot->recvmsg(sk, msg, size, flags, NULL);
#endif
	return __unix_dgram_recvmsg(sk, msg, size, flags);
}

// net/unix/af_unix.c
int __unix_dgram_recvmsg(struct sock *sk, struct msghdr *msg, size_t size,
			 int flags)
{
	struct scm_cookie scm;
	struct socket *sock = sk->sk_socket;
	struct unix_sock *u = unix_sk(sk);
	struct sk_buff *skb, *last;
	long timeo;
	int skip;
	int err;

	err = -EOPNOTSUPP;
	if (flags&MSG_OOB)
		goto out;

	timeo = sock_rcvtimeo(sk, flags & MSG_DONTWAIT);
	// 带超时时间的接收
	do {
		mutex_lock(&u->iolock);

		skip = sk_peek_offset(sk, flags);
		// 这里是从sock结构体的接收队列取消息
		skb = __skb_try_recv_datagram(sk, &sk->sk_receive_queue, flags,
					      &skip, &err, &last);
		if (skb) {
			if (!(flags & MSG_PEEK))
				scm_stat_del(sk, skb);
			break;
		}

		mutex_unlock(&u->iolock);

		if (err != -EAGAIN)
			break;
	} while (timeo &&
		 !__skb_wait_for_more_packets(sk, &sk->sk_receive_queue,
					      &err, &timeo, last));

	if (!skb) { /* implies iolock unlocked */
		unix_state_lock(sk);
		/* Signal EOF on disconnected non-blocking SEQPACKET socket. */
		if (sk->sk_type == SOCK_SEQPACKET && err == -EAGAIN &&
		    (sk->sk_shutdown & RCV_SHUTDOWN))
			err = 0;
		unix_state_unlock(sk);
		goto out;
	}

	if (wq_has_sleeper(&u->peer_wait))
		wake_up_interruptible_sync_poll(&u->peer_wait,
						EPOLLOUT | EPOLLWRNORM |
						EPOLLWRBAND);

	if (msg->msg_name)
		unix_copy_addr(msg, skb->sk);

	if (size > skb->len - skip)
		size = skb->len - skip;
	else if (size < skb->len - skip)
		msg->msg_flags |= MSG_TRUNC;

	err = skb_copy_datagram_msg(skb, skip, msg, size);
	if (err)
		goto out_free;

	if (sock_flag(sk, SOCK_RCVTSTAMP))
		__sock_recv_timestamp(msg, sk, skb);

	memset(&scm, 0, sizeof(scm));

	scm_set_cred(&scm, UNIXCB(skb).pid, UNIXCB(skb).uid, UNIXCB(skb).gid);
	// 将skb结构体还原成scm结构体
	unix_set_secdata(&scm, skb);

	if (!(flags & MSG_PEEK)) {
		if (UNIXCB(skb).fp)
			unix_detach_fds(&scm, skb);

		sk_peek_offset_bwd(sk, skb->len);
	} else {
		/* It is questionable: on PEEK we could:
		   - do not return fds - good, but too simple 8)
		   - return fds, and do not return them on read (old strategy,
		     apparently wrong)
		   - clone fds (I chose it for now, it is the most universal
		     solution)

		   POSIX 1003.1g does not actually define this clearly
		   at all. POSIX 1003.1g doesn't define a lot of things
		   clearly however!

		*/

		sk_peek_offset_fwd(sk, size);

		if (UNIXCB(skb).fp)
			unix_peek_fds(&scm, skb);
	}
	err = (flags & MSG_TRUNC) ? skb->len - skip : size;
	// 这里处理scm结构体数据
	scm_recv(sock, msg, &scm, flags);

out_free:
	skb_free_datagram(sk, skb);
	mutex_unlock(&u->iolock);
out:
	return err;
}
```

- scm接收处理函数

```cpp
// include/net/scm.h
static __inline__ void scm_recv(struct socket *sock, struct msghdr *msg,
				struct scm_cookie *scm, int flags)
{
	if (!msg->msg_control) {
		if (test_bit(SOCK_PASSCRED, &sock->flags) || scm->fp)
			msg->msg_flags |= MSG_CTRUNC;
		scm_destroy(scm);
		return;
	}

	if (test_bit(SOCK_PASSCRED, &sock->flags)) {
		struct user_namespace *current_ns = current_user_ns();
		struct ucred ucreds = {
			.pid = scm->creds.pid,
			.uid = from_kuid_munged(current_ns, scm->creds.uid),
			.gid = from_kgid_munged(current_ns, scm->creds.gid),
		};
		put_cmsg(msg, SOL_SOCKET, SCM_CREDENTIALS, sizeof(ucreds), &ucreds);
	}

	scm_destroy_cred(scm);

	scm_passec(sock, msg, scm);

	if (!scm->fp)
		return;
	// 这里是将数据转化的函数
	scm_detach_fds(msg, scm);
}
```

#### 发送句柄到其他进程的处理

- 接收到的数据处理一下然后将文件结构体转成文件句柄

```cpp
// net/core/scm.c
void scm_detach_fds(struct msghdr *msg, struct scm_cookie *scm)
{
	struct cmsghdr __user *cm =
		(__force struct cmsghdr __user *)msg->msg_control;
	unsigned int o_flags = (msg->msg_flags & MSG_CMSG_CLOEXEC) ? O_CLOEXEC : 0;
	int fdmax = min_t(int, scm_max_fds(msg), scm->fp->count);
	int __user *cmsg_data = CMSG_USER_DATA(cm);
	int err = 0, i;

	/* no use for FD passing from kernel space callers */
	if (WARN_ON_ONCE(!msg->msg_control_is_user))
		return;

	if (msg->msg_flags & MSG_CMSG_COMPAT) {
		scm_detach_fds_compat(msg, scm);
		return;
	}

	// 这里从scm中获取文件结构体然后分配句柄号，放到cmsg_data的对应位置
	for (i = 0; i < fdmax; i++) {
		err = receive_fd_user(scm->fp->fp[i], cmsg_data + i, o_flags);
		if (err < 0)
			break;
	}

	if (i > 0) {
		int cmlen = CMSG_LEN(i * sizeof(int));

		err = put_user(SOL_SOCKET, &cm->cmsg_level);
		if (!err)
			err = put_user(SCM_RIGHTS, &cm->cmsg_type);
		if (!err)
			err = put_user(cmlen, &cm->cmsg_len);
		if (!err) {
			cmlen = CMSG_SPACE(i * sizeof(int));
			if (msg->msg_controllen < cmlen)
				cmlen = msg->msg_controllen;
			msg->msg_control += cmlen;
			msg->msg_controllen -= cmlen;
		}
	}

	if (i < scm->fp->count || (scm->fp->count && fdmax <= 0))
		msg->msg_flags |= MSG_CTRUNC;

	/*
	 * All of the files that fit in the message have had their usage counts
	 * incremented, so we just free the list.
	 */
	__scm_destroy(scm);
}
EXPORT_SYMBOL(scm_detach_fds);
```

- 下面是将文件结构体分配fd的处理

```cpp
// include/linux/file.h
static inline int receive_fd_user(struct file *file, int __user *ufd,
				  unsigned int o_flags)
{
	if (ufd == NULL)
		return -EFAULT;
	return __receive_fd(file, ufd, o_flags);
}

// fs/file.c
/**
 * __receive_fd() - Install received file into file descriptor table
 * @file: struct file that was received from another process
 * @ufd: __user pointer to write new fd number to
 * @o_flags: the O_* flags to apply to the new fd entry
 *
 * Installs a received file into the file descriptor table, with appropriate
 * checks and count updates. Optionally writes the fd number to userspace, if
 * @ufd is non-NULL.
 *
 * This helper handles its own reference counting of the incoming
 * struct file.
 *
 * Returns newly install fd or -ve on error.
 */
int __receive_fd(struct file *file, int __user *ufd, unsigned int o_flags)
{
	int new_fd;
	int error;

	error = security_file_receive(file);
	if (error)
		return error;

	// 获取一个新的fd
	new_fd = get_unused_fd_flags(o_flags);
	if (new_fd < 0)
		return new_fd;

	if (ufd) {
		// 将系统的fd转成用户空间的fd赋值
		error = put_user(new_fd, ufd);
		if (error) {
			put_unused_fd(new_fd);
			return error;
		}
	}

	// 将file结构体和新的fd绑定
	// get_file会增加文件的引用计数
	fd_install(new_fd, get_file(file));
	// 如果是socket类型文件，这里处理
	__receive_sock(file);
	return new_fd;
}
```

- socket文件类型有单独的处理，应该是更新socket相关状态

```cpp
// net/core/sock.c
/*
 * When a file is received (via SCM_RIGHTS, etc), we must bump the
 * various sock-based usage counts.
 */
void __receive_sock(struct file *file)
{
	struct socket *sock;

	sock = sock_from_file(file);
	if (sock) {
		sock_update_netprioidx(&sock->sk->sk_cgrp_data);
		sock_update_classid(&sock->sk->sk_cgrp_data);
	}
}
```
