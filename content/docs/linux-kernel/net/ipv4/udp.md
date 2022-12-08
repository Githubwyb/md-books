# 一、udp socket如何进行收包

- udp会注册`udp_protocol`到`inet_protos`里面

```cpp
// net/ipv4/af_inet.c
static const struct net_protocol udp_protocol = {
	.handler =	udp_rcv,
	.err_handler =	udp_err,
	.no_policy =	1,
};
...
static int __init inet_init(void)
{
...
	if (inet_add_protocol(&udp_protocol, IPPROTO_UDP) < 0)
		pr_crit("%s: Cannot add UDP protocol\n", __func__);
...
}
```

- ipv4里面分析了，当ip层收到驱动的包之后，根据`IPPROTO_UDP`找到`udp_protocol`，然后调用`handler`函数对应`udp_rcv`

```cpp
// net/ipv4/udp.c
/*
 *	All we need to do is get the socket, and then do a checksum.
 */
// udp_rcv -call-> __udp4_lib_rcv
int __udp4_lib_rcv(struct sk_buff *skb, struct udp_table *udptable,
		   int proto)
{
	struct sock *sk;
	struct udphdr *uh;
	unsigned short ulen;
	struct rtable *rt = skb_rtable(skb);
	__be32 saddr, daddr;
	struct net *net = dev_net(skb->dev);
	bool refcounted;
	int drop_reason;

	drop_reason = SKB_DROP_REASON_NOT_SPECIFIED;

	/*
	 *  Validate the packet.
	 */
	if (!pskb_may_pull(skb, sizeof(struct udphdr)))
		goto drop;		/* No space for header. */

	uh   = udp_hdr(skb);
	ulen = ntohs(uh->len);
	saddr = ip_hdr(skb)->saddr;
	daddr = ip_hdr(skb)->daddr;

	if (ulen > skb->len)
		goto short_packet;

	if (proto == IPPROTO_UDP) {
		/* UDP validates ulen. */
		if (ulen < sizeof(*uh) || pskb_trim_rcsum(skb, ulen))
			goto short_packet;
		uh = udp_hdr(skb);
	}

	if (udp4_csum_init(skb, uh, proto))
		goto csum_error;

	sk = skb_steal_sock(skb, &refcounted);
	if (sk) {
		struct dst_entry *dst = skb_dst(skb);
		int ret;

		if (unlikely(rcu_dereference(sk->sk_rx_dst) != dst))
			udp_sk_rx_dst_set(sk, dst);

		ret = udp_unicast_rcv_skb(sk, skb, uh);
		if (refcounted)
			sock_put(sk);
		return ret;
	}

    // 这里处理广播和多播场景
	if (rt->rt_flags & (RTCF_BROADCAST|RTCF_MULTICAST))
		return __udp4_lib_mcast_deliver(net, skb, uh,
						saddr, daddr, udptable, proto);

    // 根据源地址和目的地址从udptable中找sk结构体
	sk = __udp4_lib_lookup_skb(skb, uh->source, uh->dest, udptable);
    // 找到直接给对应的sk进行处理
	if (sk)
		return udp_unicast_rcv_skb(sk, skb, uh);

	if (!xfrm4_policy_check(NULL, XFRM_POLICY_IN, skb))
		goto drop;
	nf_reset_ct(skb);

	/* No socket. Drop packet silently, if checksum is wrong */
	if (udp_lib_checksum_complete(skb))
		goto csum_error;

    // 没有socket对应此包，并且checksum是对的，会返回一个icmp目的地址和端口不可达信息
	drop_reason = SKB_DROP_REASON_NO_SOCKET;
	__UDP_INC_STATS(net, UDP_MIB_NOPORTS, proto == IPPROTO_UDPLITE);
	icmp_send(skb, ICMP_DEST_UNREACH, ICMP_PORT_UNREACH, 0);

	/*
	 * Hmm.  We got an UDP packet to a port to which we
	 * don't wanna listen.  Ignore it.
	 */
	kfree_skb_reason(skb, drop_reason);
	return 0;

short_packet:
	drop_reason = SKB_DROP_REASON_PKT_TOO_SMALL;
	net_dbg_ratelimited("UDP%s: short packet: From %pI4:%u %d/%d to %pI4:%u\n",
			    proto == IPPROTO_UDPLITE ? "Lite" : "",
			    &saddr, ntohs(uh->source),
			    ulen, skb->len,
			    &daddr, ntohs(uh->dest));
	goto drop;

csum_error:
	/*
	 * RFC1122: OK.  Discards the bad packet silently (as far as
	 * the network is concerned, anyway) as per 4.1.3.4 (MUST).
	 */
	drop_reason = SKB_DROP_REASON_UDP_CSUM;
	net_dbg_ratelimited("UDP%s: bad checksum. From %pI4:%u to %pI4:%u ulen %d\n",
			    proto == IPPROTO_UDPLITE ? "Lite" : "",
			    &saddr, ntohs(uh->source), &daddr, ntohs(uh->dest),
			    ulen);
	__UDP_INC_STATS(net, UDP_MIB_CSUMERRORS, proto == IPPROTO_UDPLITE);
drop:
	__UDP_INC_STATS(net, UDP_MIB_INERRORS, proto == IPPROTO_UDPLITE);
	kfree_skb_reason(skb, drop_reason);
	return 0;
}
```

## 1. 如何查找sk结构体

## 2. 找到sk结构体后做什么

```cpp
// net/ipv4/udp.c
/* wrapper for udp_queue_rcv_skb tacking care of csum conversion and
 * return code conversion for ip layer consumption
 */
static int udp_unicast_rcv_skb(struct sock *sk, struct sk_buff *skb,
			       struct udphdr *uh)
{
	int ret;

	if (inet_get_convert_csum(sk) && uh->check && !IS_UDPLITE(sk))
		skb_checksum_try_convert(skb, IPPROTO_UDP, inet_compute_pseudo);

	ret = udp_queue_rcv_skb(sk, skb);

	/* a return value > 0 means to resubmit the input, but
	 * it wants the return to be -protocol, or 0
	 */
	if (ret > 0)
		return -ret;
	return 0;
}
```

- 调用`udp_queue_rcv_skb`

```cpp
// net/ipv4/udp.c
static int udp_queue_rcv_skb(struct sock *sk, struct sk_buff *skb)
{
	struct sk_buff *next, *segs;
	int ret;

	if (likely(!udp_unexpected_gso(sk, skb)))
		return udp_queue_rcv_one_skb(sk, skb);

	BUILD_BUG_ON(sizeof(struct udp_skb_cb) > SKB_GSO_CB_OFFSET);
	__skb_push(skb, -skb_mac_offset(skb));
	segs = udp_rcv_segment(sk, skb, true);
	skb_list_walk_safe(segs, skb, next) {
		__skb_pull(skb, skb_transport_offset(skb));

		udp_post_segment_fix_csum(skb);
		ret = udp_queue_rcv_one_skb(sk, skb);
		if (ret > 0)
			ip_protocol_deliver_rcu(dev_net(skb->dev), skb, ret);
	}
	return 0;
}

// net/ipv4/udp.c
/* returns:
 *  -1: error
 *   0: success
 *  >0: "udp encap" protocol resubmission
 *
 * Note that in the success and error cases, the skb is assumed to
 * have either been requeued or freed.
 */
static int udp_queue_rcv_one_skb(struct sock *sk, struct sk_buff *skb)
{
	...
	return __udp_queue_rcv_skb(sk, skb);

csum_error:
	drop_reason = SKB_DROP_REASON_UDP_CSUM;
	__UDP_INC_STATS(sock_net(sk), UDP_MIB_CSUMERRORS, is_udplite);
drop:
	__UDP_INC_STATS(sock_net(sk), UDP_MIB_INERRORS, is_udplite);
	atomic_inc(&sk->sk_drops);
	kfree_skb_reason(skb, drop_reason);
	return -1;
}

// net/ipv4/udp.c
static int __udp_queue_rcv_skb(struct sock *sk, struct sk_buff *skb)
{
	int rc;

	if (inet_sk(sk)->inet_daddr) {
		sock_rps_save_rxhash(sk, skb);
		sk_mark_napi_id(sk, skb);
		sk_incoming_cpu_update(sk);
	} else {
		sk_mark_napi_id_once(sk, skb);
	}

	rc = __udp_enqueue_schedule_skb(sk, skb);
	if (rc < 0) {
		int is_udplite = IS_UDPLITE(sk);
		int drop_reason;

		/* Note that an ENOMEM error is charged twice */
		if (rc == -ENOMEM) {
			UDP_INC_STATS(sock_net(sk), UDP_MIB_RCVBUFERRORS,
					is_udplite);
			drop_reason = SKB_DROP_REASON_SOCKET_RCVBUFF;
		} else {
			UDP_INC_STATS(sock_net(sk), UDP_MIB_MEMERRORS,
				      is_udplite);
			drop_reason = SKB_DROP_REASON_PROTO_MEM;
		}
		UDP_INC_STATS(sock_net(sk), UDP_MIB_INERRORS, is_udplite);
		kfree_skb_reason(skb, drop_reason);
		trace_udp_fail_queue_rcv_skb(rc, sk);
		return -1;
	}

	return 0;
}
```

- `__udp_enqueue_schedule_skb`将包插入到队列中

```cpp
int __udp_enqueue_schedule_skb(struct sock *sk, struct sk_buff *skb)
{
	struct sk_buff_head *list = &sk->sk_receive_queue;
	int rmem, delta, amt, err = -ENOMEM;
	spinlock_t *busy = NULL;
	int size;

	/* try to avoid the costly atomic add/sub pair when the receive
	 * queue is full; always allow at least a packet
	 */
	rmem = atomic_read(&sk->sk_rmem_alloc);
	if (rmem > sk->sk_rcvbuf)
		goto drop;

	/* Under mem pressure, it might be helpful to help udp_recvmsg()
	 * having linear skbs :
	 * - Reduce memory overhead and thus increase receive queue capacity
	 * - Less cache line misses at copyout() time
	 * - Less work at consume_skb() (less alien page frag freeing)
	 */
	if (rmem > (sk->sk_rcvbuf >> 1)) {
		skb_condense(skb);

		busy = busylock_acquire(sk);
	}
	size = skb->truesize;
	udp_set_dev_scratch(skb);

	/* we drop only if the receive buf is full and the receive
	 * queue contains some other skb
	 */
	rmem = atomic_add_return(size, &sk->sk_rmem_alloc);
	if (rmem > (size + (unsigned int)sk->sk_rcvbuf))
		goto uncharge_drop;

	spin_lock(&list->lock);
	if (size >= sk->sk_forward_alloc) {
		amt = sk_mem_pages(size);
		delta = amt << SK_MEM_QUANTUM_SHIFT;
		if (!__sk_mem_raise_allocated(sk, delta, amt, SK_MEM_RECV)) {
			err = -ENOBUFS;
			spin_unlock(&list->lock);
			goto uncharge_drop;
		}

		sk->sk_forward_alloc += delta;
	}

	sk->sk_forward_alloc -= size;

	/* no need to setup a destructor, we will explicitly release the
	 * forward allocated memory on dequeue
	 */
	sock_skb_set_dropcount(sk, skb);

	// 加入队列
	__skb_queue_tail(list, skb);
	spin_unlock(&list->lock);

	// 唤醒一个线程进行处理
	if (!sock_flag(sk, SOCK_DEAD))
		sk->sk_data_ready(sk);

	busylock_release(busy);
	return 0;

uncharge_drop:
	atomic_sub(skb->truesize, &sk->sk_rmem_alloc);

drop:
	atomic_inc(&sk->sk_drops);
	busylock_release(busy);
	return err;
}
EXPORT_SYMBOL_GPL(__udp_enqueue_schedule_skb);
```

## 3. 如何唤醒recvfrom函数

- 上面插入队列后调用`sk->sdk_data_read`，此函数会唤醒一个等待队列的线程处理

# 二、recv做了什么

- 在这里进行睡眠

```cpp
// net/core/datagram.c
/*
 * Wait for the last received packet to be different from skb
 */
int __skb_wait_for_more_packets(struct sock *sk, struct sk_buff_head *queue,
				int *err, long *timeo_p,
				const struct sk_buff *skb)
{
	int error;
	DEFINE_WAIT_FUNC(wait, receiver_wake_function);

	prepare_to_wait_exclusive(sk_sleep(sk), &wait, TASK_INTERRUPTIBLE);

	/* Socket errors? */
	error = sock_error(sk);
	if (error)
		goto out_err;

	if (READ_ONCE(queue->prev) != skb)
		goto out;

	/* Socket shut down? */
	if (sk->sk_shutdown & RCV_SHUTDOWN)
		goto out_noerr;

	/* Sequenced packets can come disconnected.
	 * If so we report the problem
	 */
	error = -ENOTCONN;
	if (connection_based(sk) &&
	    !(sk->sk_state == TCP_ESTABLISHED || sk->sk_state == TCP_LISTEN))
		goto out_err;

	/* handle signals */
	if (signal_pending(current))
		goto interrupted;

	error = 0;
	*timeo_p = schedule_timeout(*timeo_p);
out:
	finish_wait(sk_sleep(sk), &wait);
	return error;
interrupted:
	error = sock_intr_errno(*timeo_p);
out_err:
	*err = error;
	goto out;
out_noerr:
	*err = 0;
	error = 1;
	goto out;
}
EXPORT_SYMBOL(__skb_wait_for_more_packets);
```

- `schedule_timeout`进行睡眠

```cpp
// kernel/time/timer.c
/**
 * schedule_timeout - sleep until timeout
 * @timeout: timeout value in jiffies
 *
 * Make the current task sleep until @timeout jiffies have elapsed.
 * The function behavior depends on the current task state
 * (see also set_current_state() description):
 *
 * %TASK_RUNNING - the scheduler is called, but the task does not sleep
 * at all. That happens because sched_submit_work() does nothing for
 * tasks in %TASK_RUNNING state.
 *
 * %TASK_UNINTERRUPTIBLE - at least @timeout jiffies are guaranteed to
 * pass before the routine returns unless the current task is explicitly
 * woken up, (e.g. by wake_up_process()).
 *
 * %TASK_INTERRUPTIBLE - the routine may return early if a signal is
 * delivered to the current task or the current task is explicitly woken
 * up.
 *
 * The current task state is guaranteed to be %TASK_RUNNING when this
 * routine returns.
 *
 * Specifying a @timeout value of %MAX_SCHEDULE_TIMEOUT will schedule
 * the CPU away without a bound on the timeout. In this case the return
 * value will be %MAX_SCHEDULE_TIMEOUT.
 *
 * Returns 0 when the timer has expired otherwise the remaining time in
 * jiffies will be returned. In all cases the return value is guaranteed
 * to be non-negative.
 */
signed long __sched schedule_timeout(signed long timeout)
{
	struct process_timer timer;
	unsigned long expire;

	switch (timeout)
	{
	case MAX_SCHEDULE_TIMEOUT:
		/*
		 * These two special cases are useful to be comfortable
		 * in the caller. Nothing more. We could take
		 * MAX_SCHEDULE_TIMEOUT from one of the negative value
		 * but I' d like to return a valid offset (>=0) to allow
		 * the caller to do everything it want with the retval.
		 */
		schedule();
		goto out;
	default:
		/*
		 * Another bit of PARANOID. Note that the retval will be
		 * 0 since no piece of kernel is supposed to do a check
		 * for a negative retval of schedule_timeout() (since it
		 * should never happens anyway). You just have the printk()
		 * that will tell you if something is gone wrong and where.
		 */
		if (timeout < 0) {
			printk(KERN_ERR "schedule_timeout: wrong timeout "
				"value %lx\n", timeout);
			dump_stack();
			__set_current_state(TASK_RUNNING);
			goto out;
		}
	}

	expire = timeout + jiffies;

	timer.task = current;
	timer_setup_on_stack(&timer.timer, process_timeout, 0);
	__mod_timer(&timer.timer, expire, MOD_TIMER_NOTPENDING);
	schedule();
	del_singleshot_timer_sync(&timer.timer);

	/* Remove the timer from the object tracker */
	destroy_timer_on_stack(&timer.timer);

	timeout = expire - jiffies;

 out:
	return timeout < 0 ? 0 : timeout;
}
EXPORT_SYMBOL(schedule_timeout);
```
