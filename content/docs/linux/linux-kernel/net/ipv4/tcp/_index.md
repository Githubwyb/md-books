---
title: "tcp"
---

# 一、总述

- [【Linux 内核网络协议栈源码剖析】数据包接收(含TCP协议状态变换)](https://www.cnblogs.com/ztguang/p/12645487.html)
- [深入理解TCP三次握手及其源代码分析](https://www.cnblogs.com/Alexkk/p/12101950.html)
- [服务器正文22：linux内核网络模块笔记:理解TCP连接建立过程、一条TCP连接多大内存、一台机器最多支持多少条TCP连接、网络优化建议（下）（8/9未完待续）](https://blog.csdn.net/weixin_43679037/article/details/126230288)
- [TCP连接的状态详解以及故障排查](https://zhuanlan.zhihu.com/p/166440446)
- [面试官：换人！他连 TCP 这几个参数都不懂](https://zhuanlan.zhihu.com/p/146752547)
- [万字详解秒杀系统！！](https://blog.csdn.net/flynetcn/article/details/120228586#comments_30579499)

## 1. 结构体关系

```plantuml
@startuml xxx

class socket {
	socket_state state;
    struct sock *sk;
    const struct proto_ops	*ops;
}

class proto_ops {}

class inet_stream_ops {}
inet_stream_ops .up.|> proto_ops: 实现

class sock {
	sk_state => __sk_common.skc_state
    sk_prot => __sk_common.skc_prot
}
class inet_sock {
    struct sock sk;
}
inet_sock .up.|> sock: inet_sock前面就是sock结构体
class inet_connection_sock  {
	struct inet_sock	  icsk_inet;
	const struct inet_connection_sock_af_ops *icsk_af_ops;
}
inet_connection_sock .up.|> inet_sock: inet_connection_sock前面就是inet_sock结构体
class tcp_sock  {
	struct inet_connection_sock	inet_conn;
}
tcp_sock .up.|> inet_connection_sock: tcp_sock前面就是inet_connection_sock结构体

class sk_prot {}
class tcp_prot {}
tcp_prot .up.|> sk_prot: 实现

sock <|-- sk_prot: 持有
socket <|-- proto_ops: 持有
socket <|-- sock: 持有

class icsk_af_ops {}
class ipv4_specific {}
ipv4_specific .up.|> icsk_af_ops: 实现

inet_connection_sock <|-- icsk_af_ops: 持有

@enduml
```

- `inet_connection_sock`扩展了`inet_sock`
- `inet_sock`扩展了`sock`
- 三个都使用`struct sock *sk`存放于`socket`结构体中

# 二、tcp状态图和源码

- tcp状态在`socket.sk->sk_state`里面储存

## 1. 状态图

![](imgs/2023-05-08-01.png)

### 1.1. 服务端监听socket accept用

```plantuml
@startuml 服务端监听socket

[*] --> TCP_CLOSE: 创建默认close状态
TCP_CLOSE --> TCP_LISTEN: 调用listen系统调用

@enduml
```

#### 1) listen系统调用 进入listen状态

```cpp
// net/ipv4/inet_connection_sock.c
// listen => __sys_listen => inet_listen => inet_csk_listen_start
int inet_csk_listen_start(struct sock *sk)
{
	...
	inet_sk_state_store(sk, TCP_LISTEN);
	...
}
```

### 1.2. 服务端数据传输socket send/recv用

```plantuml
@startuml 服务端数据传输socket

[*] --> TCP_NEW_SYN_RECV

TCP_LISTEN --> TCP_NEW_SYN_RECV : listen的socket收到syn包创建了新的socket
note left of TCP_NEW_SYN_RECV
因为TCP_SYN_RECV被fast open占用了
使用了一个新的状态表示
新的状态给request_sock结构体使用
到此状态后发送一个syn/ack包回去
end note

TCP_NEW_SYN_RECV --> TCP_SYN_RECV : 收到包
note left of TCP_SYN_RECV
此前创建的request_sock是个minisock
确认收包要建立连接，创建完整的sock结构体
完整的sock状态直接为TCP_SYN_RECV
end note

TCP_SYN_RECV --> TCP_ESTABLISHED : 确认是ack包，转此状态

TCP_FIN_WAIT2 -> TCP_TIME_WAIT : 收到fin包，回复ack
note bottom of TCP_TIME_WAIT
进入TCP_TIME_WAIT状态不需要完整sock结构体
创建inet_timewait_sock接管TCP_TIME_WAIT
原始sock直接关闭，转TCP_CLOSE
end note

@enduml
```

#### 1) listen状态收到syn包的处理

- 入口在`tcp_v4_rcv`

```cpp
// net/ipv4/tcp_ipv4.c
/*
 *	From tcp_input.c
 */

int tcp_v4_rcv(struct sk_buff *skb)
{
	...
lookup:
	// 拿到包后，根据目的地址和源地址查找有没有socket
	sk = __inet_lookup_skb(&tcp_hashinfo, skb, __tcp_hdrlen(th), th->source,
			       th->dest, sdif, &refcounted);
	...
	// 查到的socket就是服务端监听的，这里发现是listen状态直接进入tcp_v4_do_rcv
	if (sk->sk_state == TCP_LISTEN) {
		ret = tcp_v4_do_rcv(sk, skb);
		goto put_and_return;
	}
	...
}
```

```cpp
// net/ipv4/tcp_ipv4.c
int tcp_v4_do_rcv(struct sock *sk, struct sk_buff *skb)
{
	...
	if (tcp_rcv_state_process(sk, skb)) {
		rsk = sk;
		goto reset;
	}
	return 0;
	...
}

// net/ipv4/tcp_input.c
int tcp_rcv_state_process(struct sock *sk, struct sk_buff *skb)
{
	...
	switch (sk->sk_state) {
		...
	case TCP_LISTEN:
		if (th->ack)
			return 1;

		if (th->rst) {
			SKB_DR_SET(reason, TCP_RESET);
			goto discard;
		}
		// listen状态收到syn包
		if (th->syn) {
			if (th->fin) {
				SKB_DR_SET(reason, TCP_FLAGS);
				goto discard;
			}
			/* It is possible that we process SYN packets from backlog,
			 * so we need to make sure to disable BH and RCU right there.
			 */
			rcu_read_lock();
			local_bh_disable();
			// 这里进入到icsk的处理函数，处理连接状态
			acceptable = icsk->icsk_af_ops->conn_request(sk, skb) >= 0;
			local_bh_enable();
			rcu_read_unlock();

			if (!acceptable)
				return 1;
			consume_skb(skb);
			return 0;
		}
		SKB_DR_SET(reason, TCP_FLAGS);
		goto discard;

		...
	}
	...
}
```

- listen收到syn包会进入到`icsk->icsk_af_ops->conn_request`处理连接里面
- tcp的`icsk->icsk_af_ops`由下面代码注册

```cpp
// net/ipv4/tcp_ipv4.c
const struct inet_connection_sock_af_ops ipv4_specific = {
	...
	.conn_request	   = tcp_v4_conn_request,
	...
};

// net/ipv4/tcp_ipv4.c
static int tcp_v4_init_sock(struct sock *sk)
{
	struct inet_connection_sock *icsk = inet_csk(sk);

	tcp_init_sock(sk);

	icsk->icsk_af_ops = &ipv4_specific;

#ifdef CONFIG_TCP_MD5SIG
	tcp_sk(sk)->af_specific = &tcp_sock_ipv4_specific;
#endif

	return 0;
}
```

- 查看`icsk->icsk_af_ops->conn_request`也就是`tcp_v4_conn_request`

```cpp
// net/ipv4/tcp_ipv4.c
int tcp_v4_conn_request(struct sock *sk, struct sk_buff *skb)
{
	/* Never answer to SYNs send to broadcast or multicast */
	if (skb_rtable(skb)->rt_flags & (RTCF_BROADCAST | RTCF_MULTICAST))
		goto drop;

	return tcp_conn_request(&tcp_request_sock_ops,
				&tcp_request_sock_ipv4_ops, sk, skb);

drop:
	tcp_listendrop(sk);
	return 0;
}

// net/ipv4/tcp_input.c
int tcp_conn_request(struct request_sock_ops *rsk_ops,
		     const struct tcp_request_sock_ops *af_ops,
		     struct sock *sk, struct sk_buff *skb)
{
	...
	// 判断accept队列是否满了，这个要会给应用层的accept系统调用的
	if (sk_acceptq_is_full(sk)) {
		NET_INC_STATS(sock_net(sk), LINUX_MIB_LISTENOVERFLOWS);
		goto drop;
	}
	// 创建一个reqsk用于处理syn包
	req = inet_reqsk_alloc(rsk_ops, sk, !want_cookie);
	if (!req)
		goto drop;

	...
	if (fastopen_sk) {
		...
	} else {
		tcp_rsk(req)->tfo_listener = false;
		if (!want_cookie) {
			req->timeout = tcp_timeout_init((struct sock *)req);
			// 添加到requestsock队列，添加一个超时时间
			inet_csk_reqsk_queue_hash_add(sk, req, req->timeout);
		}
		// 回包syn/ack
		af_ops->send_synack(sk, dst, &fl, req, &foc,
				    !want_cookie ? TCP_SYNACK_NORMAL :
						   TCP_SYNACK_COOKIE,
				    skb);
		if (want_cookie) {
			reqsk_free(req);
			return 0;
		}
	}
	reqsk_put(req);
	return 0;
	...
}
```

- 创建的reqsk状态直接就是`TCP_NEW_SYN_RECV`

```cpp
// net/ipv4/tcp_input.c
struct request_sock *inet_reqsk_alloc(const struct request_sock_ops *ops,
				      struct sock *sk_listener,
				      bool attach_listener)
{
	struct request_sock *req = reqsk_alloc(ops, sk_listener,
					       attach_listener);

	if (req) {
		struct inet_request_sock *ireq = inet_rsk(req);

		ireq->ireq_opt = NULL;
#if IS_ENABLED(CONFIG_IPV6)
		ireq->pktopts = NULL;
#endif
		atomic64_set(&ireq->ir_cookie, 0);
		ireq->ireq_state = TCP_NEW_SYN_RECV;
		write_pnet(&ireq->ireq_net, sock_net(sk_listener));
		ireq->ireq_family = sk_listener->sk_family;
		req->timeout = TCP_TIMEOUT_INIT;
	}

	return req;
}
EXPORT_SYMBOL(inet_reqsk_alloc);
```

- `af_ops->send_synack`对应上面的`tcp_request_sock_ipv4_ops->tcp_v4_send_synack`
- 直接将IP包写到协议栈，不经过应用层

```cpp
// net/ipv4/tcp_ipv4.c
const struct tcp_request_sock_ops tcp_request_sock_ipv4_ops = {
	...
	.send_synack	=	tcp_v4_send_synack,
};

// net/ipv4/tcp_ipv4.c
/*
 *	Send a SYN-ACK after having received a SYN.
 *	This still operates on a request_sock only, not on a big
 *	socket.
 */
static int tcp_v4_send_synack(const struct sock *sk, struct dst_entry *dst,
			      struct flowi *fl,
			      struct request_sock *req,
			      struct tcp_fastopen_cookie *foc,
			      enum tcp_synack_type synack_type,
			      struct sk_buff *syn_skb)
{
	const struct inet_request_sock *ireq = inet_rsk(req);
	struct flowi4 fl4;
	int err = -1;
	struct sk_buff *skb;
	u8 tos;

	/* First, grab a route. */
	if (!dst && (dst = inet_csk_route_req(sk, &fl4, req)) == NULL)
		return -1;

	skb = tcp_make_synack(sk, dst, req, foc, synack_type, syn_skb);

	if (skb) {
		__tcp_v4_send_check(skb, ireq->ir_loc_addr, ireq->ir_rmt_addr);

		tos = READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_reflect_tos) ?
				(tcp_rsk(req)->syn_tos & ~INET_ECN_MASK) |
				(inet_sk(sk)->tos & INET_ECN_MASK) :
				inet_sk(sk)->tos;

		if (!INET_ECN_is_capable(tos) &&
		    tcp_bpf_ca_needs_ecn((struct sock *)req))
			tos |= INET_ECN_ECT_0;

		rcu_read_lock();
		err = ip_build_and_send_pkt(skb, sk, ireq->ir_loc_addr,
					    ireq->ir_rmt_addr,
					    rcu_dereference(ireq->ireq_opt),
					    tos);
		rcu_read_unlock();
		err = net_xmit_eval(err);
	}

	return err;
}
```

#### 2) TCP_NEW_SYN_RECV 发送了syn/ack后收到ACK包处理

##### (1) 收包处理

- 入口在`tcp_v4_rcv`

```cpp
// net/ipv4/tcp_ipv4.c
int tcp_v4_rcv(struct sk_buff *skb)
{
	...
lookup:
	// 拿到包后，根据目的地址和源地址查找有没有socket
	sk = __inet_lookup_skb(&tcp_hashinfo, skb, __tcp_hdrlen(th), th->source,
			       th->dest, sdif, &refcounted);
	...
	// 查到的socket是TCP_NEW_SYN_RECV状态处理
	if (sk->sk_state == TCP_NEW_SYN_RECV) {
		// 这里是request_sock，临时用的socket
		struct request_sock *req = inet_reqsk(sk);
		bool req_stolen = false;
		struct sock *nsk;

		// sk赋值为监听的服务端socket
		sk = req->rsk_listener;
		...
		refcounted = true;
		nsk = NULL;
		if (!tcp_filter(sk, skb)) {
			th = (const struct tcphdr *)skb->data;
			iph = ip_hdr(skb);
			tcp_v4_fill_cb(skb, iph, th);
			// 这里处理一下request_sock
			nsk = tcp_check_req(sk, skb, req, false, &req_stolen);
		} else {
			drop_reason = SKB_DROP_REASON_SOCKET_FILTER;
		}
		...
	}
	...
}
```

- 进入`tcp_check_req`处理

###### 收到ack

```cpp
// net/ipv4/tcp_minisocks.c
struct sock *tcp_check_req(struct sock *sk, struct sk_buff *skb,
			   struct request_sock *req,
			   bool fastopen, bool *req_stolen)
{
	...
	/* ACK sequence verified above, just make sure ACK is
	 * set.  If ACK not set, just silently drop the packet.
	 *
	 * XXX (TFO) - if we ever allow "data after SYN", the
	 * following check needs to be removed.
	 */
	// 后面处理必须是收到了ack
	if (!(flg & TCP_FLAG_ACK))
		return NULL;
	...
	/* OK, ACK is valid, create big socket and
	 * feed this segment to it. It will repeat all
	 * the tests. THIS SEGMENT MUST MOVE SOCKET TO
	 * ESTABLISHED STATE. If it will be dropped after
	 * socket is created, wait for troubles.
	 */
	child = inet_csk(sk)->icsk_af_ops->syn_recv_sock(sk, skb, req, NULL,
							 req, &own_req);
	if (!child)
		goto listen_overflow;
	...
}
```

- 进入到`icsk_af_ops->syn_recv_sock`也就是`tcp_v4_syn_recv_sock`

```cpp
// net/ipv4/tcp_ipv4.c
const struct inet_connection_sock_af_ops ipv4_specific = {
	...
	.syn_recv_sock	   = tcp_v4_syn_recv_sock,
	...
};
```

```cpp
// net/ipv4/tcp_ipv4.c
struct sock *tcp_v4_syn_recv_sock(const struct sock *sk, struct sk_buff *skb,
				  struct request_sock *req,
				  struct dst_entry *dst,
				  struct request_sock *req_unhash,
				  bool *own_req)
{
	...
	// 再次判断一下监听的sk是否accept队列满了
	if (sk_acceptq_is_full(sk))
		goto exit_overflow;

	// 建立一个新的socket，设置新的socket为TCP_SYN_RECV
	newsk = tcp_create_openreq_child(sk, req, skb);
	if (!newsk)
		goto exit_nonewsk;
	...
}
```

- 创建新的socket替换`request_sock`，状态直接为`TCP_SYN_RECV`

```cpp
// net/ipv4/tcp_minisocks.c
struct sock *tcp_create_openreq_child(const struct sock *sk,
				      struct request_sock *req,
				      struct sk_buff *skb)
{
	struct sock *newsk = inet_csk_clone_lock(sk, req, GFP_ATOMIC);
	...
}

// net/ipv4/inet_connection_sock.c
/* 到这一步的堆栈信息
inet_csk_clone_lock(const struct sock * sk, const struct request_sock * req, const gfp_t priority) (/net/ipv4/inet_connection_sock.c:963)
tcp_create_openreq_child(const struct sock * sk, struct request_sock * req, struct sk_buff * skb) (/net/ipv4/tcp_minisocks.c:453)
tcp_v4_syn_recv_sock(const struct sock * sk, struct sk_buff * skb, struct request_sock * req, struct dst_entry * dst, struct request_sock * req_unhash, bool * own_req) (/net/ipv4/tcp_ipv4.c:1502)
tcp_check_req(struct sock * sk, struct sk_buff * skb, struct request_sock * req, bool fastopen, bool * req_stolen) (/net/ipv4/tcp_minisocks.c:764)
tcp_v4_rcv(struct sk_buff * skb) (/net/ipv4/tcp_ipv4.c:2004)
*/
struct sock *inet_csk_clone_lock(const struct sock *sk,
				 const struct request_sock *req,
				 const gfp_t priority)
{
	struct sock *newsk = sk_clone_lock(sk, priority);

	if (newsk) {
		struct inet_connection_sock *newicsk = inet_csk(newsk);

		// 创建完整的sock，状态为TCP_SYN_RECV
		inet_sk_set_state(newsk, TCP_SYN_RECV);
		newicsk->icsk_bind_hash = NULL;

		inet_sk(newsk)->inet_dport = inet_rsk(req)->ir_rmt_port;
		inet_sk(newsk)->inet_num = inet_rsk(req)->ir_num;
		inet_sk(newsk)->inet_sport = htons(inet_rsk(req)->ir_num);

		/* listeners have SOCK_RCU_FREE, not the children */
		sock_reset_flag(newsk, SOCK_RCU_FREE);

		inet_sk(newsk)->mc_list = NULL;

		newsk->sk_mark = inet_rsk(req)->ir_mark;
		atomic64_set(&newsk->sk_cookie,
			     atomic64_read(&inet_rsk(req)->ir_cookie));

		newicsk->icsk_retransmits = 0;
		newicsk->icsk_backoff	  = 0;
		newicsk->icsk_probes_out  = 0;
		newicsk->icsk_probes_tstamp = 0;

		/* Deinitialize accept_queue to trap illegal accesses. */
		memset(&newicsk->icsk_accept_queue, 0, sizeof(newicsk->icsk_accept_queue));

		inet_clone_ulp(req, newsk, priority);

		security_inet_csk_clone(newsk, req);
	}
	return newsk;
}
```

- 新socket创建完之后回到`tcp_v4_rcv`处理

```cpp
// net/ipv4/tcp_ipv4.c
int tcp_v4_rcv(struct sk_buff *skb)
{
	...
lookup:
	// 拿到包后，根据目的地址和源地址查找有没有socket
	sk = __inet_lookup_skb(&tcp_hashinfo, skb, __tcp_hdrlen(th), th->source,
			       th->dest, sdif, &refcounted);
	...
	// 查到的socket是TCP_NEW_SYN_RECV状态处理
	if (sk->sk_state == TCP_NEW_SYN_RECV) {
		// 这里是request_sock，临时用的socket
		struct request_sock *req = inet_reqsk(sk);
		bool req_stolen = false;
		struct sock *nsk;

		// sk赋值为监听的服务端socket
		sk = req->rsk_listener;
		...
		refcounted = true;
		nsk = NULL;
		if (!tcp_filter(sk, skb)) {
			th = (const struct tcphdr *)skb->data;
			iph = ip_hdr(skb);
			tcp_v4_fill_cb(skb, iph, th);
			// 这里处理一下request_sock，在这里创建了新的socket返回
			nsk = tcp_check_req(sk, skb, req, false, &req_stolen);
		} else {
			drop_reason = SKB_DROP_REASON_SOCKET_FILTER;
		}
		...
		if (nsk == sk) {
			reqsk_put(req);
			tcp_v4_restore_cb(skb);
		// 进入到tcp_child_process处理包
		} else if (tcp_child_process(sk, nsk, skb)) {
			tcp_v4_send_reset(nsk, skb);
			goto discard_and_relse;
		} else {
			sock_put(sk);
			return 0;
		}
	}
	...
}
```

- 紧接着进入`tcp_child_process`

```cpp
// net/ipv4/tcp_minisocks.c
int tcp_child_process(struct sock *parent, struct sock *child,
		      struct sk_buff *skb)
	__releases(&((child)->sk_lock.slock))
{
	int ret = 0;
	int state = child->sk_state;

	/* record sk_napi_id and sk_rx_queue_mapping of child. */
	sk_mark_napi_id_set(child, skb);

	tcp_segs_in(tcp_sk(child), skb);
	if (!sock_owned_by_user(child)) {
		// 不是用户处理的socket就进入tcp_rcv_state_process
		ret = tcp_rcv_state_process(child, skb);
		/* Wakeup parent, send SIGIO */
		if (state == TCP_SYN_RECV && child->sk_state != state)
			parent->sk_data_ready(parent);
	} else {
		/* Alas, it is possible again, because we do lookup
		 * in main socket hash table and lock on listening
		 * socket does not protect us more.
		 */
		__sk_add_backlog(child, skb);
	}

	bh_unlock_sock(child);
	sock_put(child);
	return ret;
}
```

- 进入`tcp_rcv_state_process`后连接状态设置为`TCP_ESTABLISHED`

```cpp
// net/ipv4/tcp_input.c
/* 到这一步的堆栈
tcp_rcv_state_process(struct sock * sk, struct sk_buff * skb) (/net/ipv4/tcp_input.c:6541)
tcp_child_process(struct sock * parent, struct sock * child, struct sk_buff * skb) (/net/ipv4/tcp_minisocks.c:836)
tcp_v4_rcv(struct sk_buff * skb) (/net/ipv4/tcp_ipv4.c:2026)
*/
int tcp_rcv_state_process(struct sock *sk, struct sk_buff *skb)
{
	...
	if (!th->ack && !th->rst && !th->syn) {
		SKB_DR_SET(reason, TCP_FLAGS);
		goto discard;
	}
	if (!tcp_validate_incoming(sk, skb, th, 0))
		return 0;

	/* step 5: check the ACK field */
	acceptable = tcp_ack(sk, skb, FLAG_SLOWPATH |
				      FLAG_UPDATE_TS_RECENT |
				      FLAG_NO_CHALLENGE_ACK) > 0;

	if (!acceptable) {
		if (sk->sk_state == TCP_SYN_RECV)
			return 1;	/* send one RST */
		tcp_send_challenge_ack(sk);
		SKB_DR_SET(reason, TCP_OLD_ACK);
		goto discard;
	}
	switch (sk->sk_state) {
	case TCP_SYN_RECV:
		tp->delivered++; /* SYN-ACK delivery isn't tracked in tcp_ack */
		if (!tp->srtt_us)
			tcp_synack_rtt_meas(sk, req);

		if (req) {
			tcp_rcv_synrecv_state_fastopen(sk);
		} else {
			tcp_try_undo_spurious_syn(sk);
			tp->retrans_stamp = 0;
			tcp_init_transfer(sk, BPF_SOCK_OPS_PASSIVE_ESTABLISHED_CB,
					  skb);
			WRITE_ONCE(tp->copied_seq, tp->rcv_nxt);
		}
		smp_mb();
		// 将连接状态设置为TCP_ESTABLISHED
		tcp_set_state(sk, TCP_ESTABLISHED);
		sk->sk_state_change(sk);

		...
		break;

		...
	}
	...
}
```

### 1.3. 客户端

```plantuml
@startuml

[*] --> TCP_SYN_SENT: 系统调用connect()

TCP_SYN_SENT --> TCP_SYN_RCVD: 接收到SYN-ACK

TCP_SYN_SENT --> TCP_CLOSED: 超时

TCP_SYN_RCVD --> TCP_ESTABLISHED: 接收到ACK

TCP_ESTABLISHED --> TCP_CLOSED: 关闭连接

TCP_CLOSED --> [*]

@enduml
```

#### 1) `TCP_CLOSED => TCP_SYN_SENT` 关闭状态发起connect系统调用

```cpp
/*
tcp_v4_connect(struct sock * sk, struct sockaddr * uaddr, int addr_len) (net/ipv4/tcp_ipv4.c:275)
__inet_stream_connect(struct socket * sock, struct sockaddr * uaddr, int addr_len, int flags, int is_sendmsg) (net/ipv4/af_inet.c:660)
inet_stream_connect(struct socket * sock, struct sockaddr * uaddr, int addr_len, int flags) (net/ipv4/af_inet.c:724)
__sys_connect(int fd, struct sockaddr * uservaddr, int addrlen) (net/socket.c:1996)
__do_sys_connect(int addrlen, struct sockaddr * uservaddr, int fd) (net/socket.c:2006)
__se_sys_connect(long addrlen, long uservaddr, long fd) (net/socket.c:2003)
__x64_sys_connect(const struct pt_regs * regs) (net/socket.c:2003)
do_syscall_x64(int nr, struct pt_regs * regs) (arch/x86/entry/common.c:50)
do_syscall_64(struct pt_regs * regs, int nr) (arch/x86/entry/common.c:80)
entry_SYSCALL_64() (arch/x86/entry/entry_64.S:120)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
fixed_percpu_data (Unknown Source:0)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
fixed_percpu_data (Unknown Source:0)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
 */
/* This will initiate an outgoing connection. */
int tcp_v4_connect(struct sock *sk, struct sockaddr *uaddr, int addr_len)
{
	...
	/* Socket identity is still unknown (sport may be zero).
	 * However we set state to SYN-SENT and not releasing socket
	 * lock select source port, enter ourselves into the hash tables and
	 * complete initialization after this.
	 */
	// 转到TCP_SYN_SENT状态
	tcp_set_state(sk, TCP_SYN_SENT);
	...
	// 发出sync包
	err = tcp_connect(sk);
}
```

### 1.4. TCP_CLOSE状态

#### 1) 初始化

```cpp
// net/core/sock.c
// socket() => __sys_socket() => sock_create() => __sock_create() => inet_create => sock_init_data
void sock_init_data(struct socket *sock, struct sock *sk)
{
	...
	sk->sk_state		=	TCP_CLOSE;
	...
}
EXPORT_SYMBOL(sock_init_data);
```

#### 2) TCP_FIN_WAIT2到TCP_TIME_WAIT，原始sock转成TCP_CLOSE

```cpp
// net/ipv4/tcp_input.c
static void tcp_data_queue(struct sock *sk, struct sk_buff *skb)
{
	struct tcp_sock *tp = tcp_sk(sk);
	...
	/*  Queue data for delivery to the user.
	 *  Packets in sequence go to the receive queue.
	 *  Out of sequence packets to the out_of_order_queue.
	 */
	if (TCP_SKB_CB(skb)->seq == tp->rcv_nxt) {
		...
		if (TCP_SKB_CB(skb)->tcp_flags & TCPHDR_FIN)
			tcp_fin(sk);
		...
		return;
	}
	...
}

// net/ipv4/tcp_input.c
/*
 * 	Process the FIN bit. This now behaves as it is supposed to work
 *	and the FIN takes effect when it is validly part of sequence
 *	space. Not before when we get holes.
 *
 *	If we are ESTABLISHED, a received fin moves us to CLOSE-WAIT
 *	(and thence onto LAST-ACK and finally, CLOSE, we never enter
 *	TIME-WAIT)
 *
 *	If we are in FINWAIT-1, a received FIN indicates simultaneous
 *	close and we go into CLOSING (and later onto TIME-WAIT)
 *
 *	If we are in FINWAIT-2, a received FIN moves us to TIME-WAIT.
 */
void tcp_fin(struct sock *sk)
{
	struct tcp_sock *tp = tcp_sk(sk);
	...
	switch (sk->sk_state) {
		...
	case TCP_FIN_WAIT2:
		/* Received a FIN -- send ACK and enter TIME_WAIT. */
		tcp_send_ack(sk);
		tcp_time_wait(sk, TCP_TIME_WAIT, 0);
		break;
		...
	}
	...
}

// net/ipv4/tcp_minisocks.c
/*
 * Move a socket to time-wait or dead fin-wait-2 state.
 */
void tcp_time_wait(struct sock *sk, int state, int timeo)
{
	const struct inet_connection_sock *icsk = inet_csk(sk);
	const struct tcp_sock *tp = tcp_sk(sk);
	struct inet_timewait_sock *tw;
	struct inet_timewait_death_row *tcp_death_row = sock_net(sk)->ipv4.tcp_death_row;

	tw = inet_twsk_alloc(sk, tcp_death_row, state);
	...
	tcp_update_metrics(sk);
	tcp_done(sk);
}
EXPORT_SYMBOL(tcp_time_wait);
```

- 原始sock结构体sk转成`TCP_CLOSE`状态，使用`inet_timewait_sock`的minisock接管`TCP_TIME_WAIT`状态

```cpp
// net/ipv4/inet_timewait_sock.c
struct inet_timewait_sock *inet_twsk_alloc(const struct sock *sk,
					   struct inet_timewait_death_row *dr,
					   const int state)
{
	struct inet_timewait_sock *tw;

	if (refcount_read(&dr->tw_refcount) - 1 >=
	    READ_ONCE(dr->sysctl_max_tw_buckets))
		return NULL;

	tw = kmem_cache_alloc(sk->sk_prot_creator->twsk_prot->twsk_slab,
			      GFP_ATOMIC);
	if (tw) {
		const struct inet_sock *inet = inet_sk(sk);

		tw->tw_dr	    = dr;
		/* Give us an identity. */
		tw->tw_daddr	    = inet->inet_daddr;
		tw->tw_rcv_saddr    = inet->inet_rcv_saddr;
		tw->tw_bound_dev_if = sk->sk_bound_dev_if;
		tw->tw_tos	    = inet->tos;
		tw->tw_num	    = inet->inet_num;
		tw->tw_state	    = TCP_TIME_WAIT;
		tw->tw_substate	    = state;
		tw->tw_sport	    = inet->inet_sport;
		tw->tw_dport	    = inet->inet_dport;
		tw->tw_family	    = sk->sk_family;
		tw->tw_reuse	    = sk->sk_reuse;
		tw->tw_reuseport    = sk->sk_reuseport;
		tw->tw_hash	    = sk->sk_hash;
		tw->tw_ipv6only	    = 0;
		tw->tw_transparent  = inet->transparent;
		tw->tw_prot	    = sk->sk_prot_creator;
		atomic64_set(&tw->tw_cookie, atomic64_read(&sk->sk_cookie));
		twsk_net_set(tw, sock_net(sk));
		timer_setup(&tw->tw_timer, tw_timer_handler, TIMER_PINNED);
		/*
		 * Because we use RCU lookups, we should not set tw_refcnt
		 * to a non null value before everything is setup for this
		 * timewait socket.
		 */
		refcount_set(&tw->tw_refcnt, 0);

		__module_get(tw->tw_prot->owner);
	}

	return tw;
}
EXPORT_SYMBOL_GPL(inet_twsk_alloc);

// net/ipv4/tcp.c
void tcp_done(struct sock *sk)
{
	struct request_sock *req;

	/* We might be called with a new socket, after
	 * inet_csk_prepare_forced_close() has been called
	 * so we can not use lockdep_sock_is_held(sk)
	 */
	req = rcu_dereference_protected(tcp_sk(sk)->fastopen_rsk, 1);

	if (sk->sk_state == TCP_SYN_SENT || sk->sk_state == TCP_SYN_RECV)
		TCP_INC_STATS(sock_net(sk), TCP_MIB_ATTEMPTFAILS);

	tcp_set_state(sk, TCP_CLOSE);
	tcp_clear_xmit_timers(sk);
	if (req)
		reqsk_fastopen_remove(sk, req, false);

	sk->sk_shutdown = SHUTDOWN_MASK;

	if (!sock_flag(sk, SOCK_DEAD))
		sk->sk_state_change(sk);
	else
		inet_csk_destroy_sock(sk);
}
EXPORT_SYMBOL_GPL(tcp_done);
```

## 2. 数据包构造

### 2.1. syn包

- connect发包到OUTPUT链的堆栈

```cpp
/*
__ip_local_out(struct net * net, struct sock * sk, struct sk_buff * skb) (net/ipv4/ip_output.c:103)
ip_local_out(struct net * net, struct sock * sk, struct sk_buff * skb) (net/ipv4/ip_output.c:124)
__ip_queue_xmit(struct sock * sk, struct sk_buff * skb, struct flowi * fl, __u8 tos) (net/ipv4/ip_output.c:532)
ip_queue_xmit(struct sock * sk, struct sk_buff * skb, struct flowi * fl) (net/ipv4/ip_output.c:546)
__tcp_transmit_skb(struct sock * sk, struct sk_buff * skb, int clone_it, gfp_t gfp_mask, u32 rcv_nxt) (net/ipv4/tcp_output.c:1402)
tcp_transmit_skb(gfp_t gfp_mask, int clone_it, struct sk_buff * skb, struct sock * sk) (net/ipv4/tcp_output.c:1420)
tcp_connect(struct sock * sk) (net/ipv4/tcp_output.c:3853)
tcp_v4_connect(struct sock * sk, struct sockaddr * uaddr, int addr_len) (net/ipv4/tcp_ipv4.c:313)
__inet_stream_connect(struct socket * sock, struct sockaddr * uaddr, int addr_len, int flags, int is_sendmsg) (net/ipv4/af_inet.c:660)
inet_stream_connect(struct socket * sock, struct sockaddr * uaddr, int addr_len, int flags) (net/ipv4/af_inet.c:724)
__sys_connect(int fd, struct sockaddr * uservaddr, int addrlen) (net/socket.c:1996)
__do_sys_connect(int addrlen, struct sockaddr * uservaddr, int fd) (net/socket.c:2006)
__se_sys_connect(long addrlen, long uservaddr, long fd) (net/socket.c:2003)
__x64_sys_connect(const struct pt_regs * regs) (net/socket.c:2003)
do_syscall_x64(int nr, struct pt_regs * regs) (arch/x86/entry/common.c:50)
do_syscall_64(struct pt_regs * regs, int nr) (arch/x86/entry/common.c:80)
entry_SYSCALL_64() (arch/x86/entry/entry_64.S:120)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
fixed_percpu_data (Unknown Source:0)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
*/
int __ip_local_out(struct net *net, struct sock *sk, struct sk_buff *skb)
{
	struct iphdr *iph = ip_hdr(skb);

	iph->tot_len = htons(skb->len);
	ip_send_check(iph);

	/* if egress device is enslaved to an L3 master device pass the
	 * skb to its handler for processing
	 */
	skb = l3mdev_ip_out(sk, skb);
	if (unlikely(!skb))
		return 0;

	skb->protocol = htons(ETH_P_IP);

	return nf_hook(NFPROTO_IPV4, NF_INET_LOCAL_OUT,
		       net, sk, skb, NULL, skb_dst(skb)->dev,
		       dst_output);
}
```

# 三、几个异常场景的源码解释

## 1. 向一个服务器没有监听的端口发送syn包，会收到rst

- 先看[ipv4收包过程](/docs/linux/linux-kernel/net/ipv4/ipv4/#%E4%BA%8Cipv4%E6%94%B6%E5%8C%85%E5%90%8E%E5%A6%82%E4%BD%95%E5%A4%84%E7%90%86)，tcp处理函数为`tcp_v4_rcv`

```cpp
// net/ipv4/tcp_ipv4.c
/*
 *	From tcp_input.c
 */

int tcp_v4_rcv(struct sk_buff *skb)
{
	...
	// 这里根据skb里面的五元组找sock结构体，因为没有监听，所以找不到
	sk = __inet_lookup_skb(&tcp_hashinfo, skb, __tcp_hdrlen(th), th->source,
			       th->dest, sdif, &refcounted);
	if (!sk)
		// 找不到，跳no_tcp_socket
		goto no_tcp_socket;
	...
no_tcp_socket:
	drop_reason = SKB_DROP_REASON_NO_SOCKET;
	// 这里会检查策略，linux可以配置策略是丢包还是回复rst，默认配置是回复rst
	if (!xfrm4_policy_check(NULL, XFRM_POLICY_IN, skb))
		goto discard_it;

	tcp_v4_fill_cb(skb, iph, th);

	// 检查checksum，因为包合法，所以肯定成功，这里返回1是失败
	if (tcp_checksum_complete(skb)) {
csum_error:
		drop_reason = SKB_DROP_REASON_TCP_CSUM;
		trace_tcp_bad_csum(skb);
		__TCP_INC_STATS(net, TCP_MIB_CSUMERRORS);
bad_packet:
		__TCP_INC_STATS(net, TCP_MIB_INERRS);
	} else {
		// 成功就发送rst
		tcp_v4_send_reset(NULL, skb);
	}

discard_it:
	SKB_DR_OR(drop_reason, NOT_SPECIFIED);
	/* Discard frame. */
	kfree_skb_reason(skb, drop_reason);
	return 0;
	...
```

# 四、socket相关接口

## 1. 相关接口定义

```cpp
// net/ipv4/af_inet.c
/* Upon startup we insert all the elements in inetsw_array[] into
 * the linked list inetsw.
 */
static struct inet_protosw inetsw_array[] =
{
    {
        .type =       SOCK_STREAM,
        .protocol =   IPPROTO_TCP,
        .prot =       &tcp_prot,
        .ops =        &inet_stream_ops,
        .flags =      INET_PROTOSW_PERMANENT |
                  INET_PROTOSW_ICSK,
    },
    ...
}

// net/ipv4/af_inet.c
const struct proto_ops inet_stream_ops = {
	.family		   = PF_INET,
	.owner		   = THIS_MODULE,
	.release	   = inet_release,
	.bind		   = inet_bind,
	.connect	   = inet_stream_connect,
	.socketpair	   = sock_no_socketpair,
	.accept		   = inet_accept,
	.getname	   = inet_getname,
	.poll		   = tcp_poll,
	.ioctl		   = inet_ioctl,
	.gettstamp	   = sock_gettstamp,
	.listen		   = inet_listen,
	.shutdown	   = inet_shutdown,
	.setsockopt	   = sock_common_setsockopt,
	.getsockopt	   = sock_common_getsockopt,
	.sendmsg	   = inet_sendmsg,
	.recvmsg	   = inet_recvmsg,
#ifdef CONFIG_MMU
	.mmap		   = tcp_mmap,
#endif
	.sendpage	   = inet_sendpage,
	.splice_read	   = tcp_splice_read,
	.read_sock	   = tcp_read_sock,
	.sendmsg_locked    = tcp_sendmsg_locked,
	.sendpage_locked   = tcp_sendpage_locked,
	.peek_len	   = tcp_peek_len,
#ifdef CONFIG_COMPAT
	.compat_ioctl	   = inet_compat_ioctl,
#endif
	.set_rcvlowat	   = tcp_set_rcvlowat,
};
EXPORT_SYMBOL(inet_stream_ops);

// net/ipv4/tcp_ipv4.c
struct proto tcp_prot = {
	.name			= "TCP",
	.owner			= THIS_MODULE,
	.close			= tcp_close,
	.pre_connect		= tcp_v4_pre_connect,
	.connect		= tcp_v4_connect,
	.disconnect		= tcp_disconnect,
	.accept			= inet_csk_accept,
	.ioctl			= tcp_ioctl,
	.init			= tcp_v4_init_sock,
	.destroy		= tcp_v4_destroy_sock,
	.shutdown		= tcp_shutdown,
	.setsockopt		= tcp_setsockopt,
	.getsockopt		= tcp_getsockopt,
	.bpf_bypass_getsockopt	= tcp_bpf_bypass_getsockopt,
	.keepalive		= tcp_set_keepalive,
	.recvmsg		= tcp_recvmsg,
	.sendmsg		= tcp_sendmsg,
	.sendpage		= tcp_sendpage,
	.backlog_rcv		= tcp_v4_do_rcv,
	.release_cb		= tcp_release_cb,
	.hash			= inet_hash,
	.unhash			= inet_unhash,
	.get_port		= inet_csk_get_port,
	.put_port		= inet_put_port,
#ifdef CONFIG_BPF_SYSCALL
	.psock_update_sk_prot	= tcp_bpf_update_proto,
#endif
	.enter_memory_pressure	= tcp_enter_memory_pressure,
	.leave_memory_pressure	= tcp_leave_memory_pressure,
	.stream_memory_free	= tcp_stream_memory_free,
	.sockets_allocated	= &tcp_sockets_allocated,
	.orphan_count		= &tcp_orphan_count,
	.memory_allocated	= &tcp_memory_allocated,
	.memory_pressure	= &tcp_memory_pressure,
	.sysctl_mem		= sysctl_tcp_mem,
	.sysctl_wmem_offset	= offsetof(struct net, ipv4.sysctl_tcp_wmem),
	.sysctl_rmem_offset	= offsetof(struct net, ipv4.sysctl_tcp_rmem),
	.max_header		= MAX_TCP_HEADER,
	.obj_size		= sizeof(struct tcp_sock),
	.slab_flags		= SLAB_TYPESAFE_BY_RCU,
	.twsk_prot		= &tcp_timewait_sock_ops,
	.rsk_prot		= &tcp_request_sock_ops,
	.h.hashinfo		= &tcp_hashinfo,
	.no_autobind		= true,
	.diag_destroy		= tcp_abort,
};
EXPORT_SYMBOL(tcp_prot);
```

## 2. 注册到socket里面的特定结构

### 2.1. `socket.sk->sk_prot => tcp_prot`、`socket.proto_ops => inet_stream_ops`

```cpp
// net/ipv4/af_inet.c
/* Upon startup we insert all the elements in inetsw_array[] into
 * the linked list inetsw.
 */
static struct inet_protosw inetsw_array[] =
{
    {
        .type =       SOCK_STREAM,
        .protocol =   IPPROTO_TCP,
        .prot =       &tcp_prot,
        .ops =        &inet_stream_ops,
        .flags =      INET_PROTOSW_PERMANENT |
                  INET_PROTOSW_ICSK,
    },
    ...
}

// net/ipv4/af_inet.c
/*
 *	Create an inet socket.
 */
// socket => __do_sys_socket => __sys_socket => __sys_socket_create => sock_create => __sock_create => inet_create
static int inet_create(struct net *net, struct socket *sock, int protocol,
               int kern)
{
	...
    // 从inetsw中找到对应协议的结构体，赋值给answer变量
    list_for_each_entry_rcu(answer, &inetsw[sock->type], list) {

        err = 0;
        /* Check the non-wild match. */
        if (protocol == answer->protocol) {
            if (protocol != IPPROTO_IP)
                break;
        } else {
            /* Check for the two wild cases. */
            if (IPPROTO_IP == protocol) {
                protocol = answer->protocol;
                break;
            }
            if (IPPROTO_IP == answer->protocol)
                break;
        }
        err = -EPROTONOSUPPORT;
    }
	...
    // 将对应协议的操作放到sock里面
    sock->ops = answer->ops;
    answer_prot = answer->prot;
    answer_flags = answer->flags;
    rcu_read_unlock();

    WARN_ON(!answer_prot->slab);

    err = -ENOMEM;
    sk = sk_alloc(net, PF_INET, GFP_KERNEL, answer_prot, kern);
	...
}
```

### 2.2. `((inet_connection_sock *)(socket.sk))->icsk_af_ops => ipv4_specific`

- 上面注册了`tcp_prot`到`socket.sk->sk_prot`
- 在`inet_create`中调用了init

```cpp

// net/ipv4/tcp_ipv4.c
struct proto tcp_prot = {
	...
	.init			= tcp_v4_init_sock,
	...
};
EXPORT_SYMBOL(tcp_prot);

// net/ipv4/af_inet.c
/*
 *	Create an inet socket.
 */

static int inet_create(struct net *net, struct socket *sock, int protocol,
               int kern)
{
	...
    if (sk->sk_prot->init) {
		// 这里调用tcp特定的init
        err = sk->sk_prot->init(sk);
        if (err) {
            sk_common_release(sk);
            goto out;
        }
    }
	...
}
```

- init也就是`tcp_v4_init_sock`

```cpp
/* NOTE: A lot of things set to zero explicitly by call to
 *       sk_alloc() so need not be done here.
 */
static int tcp_v4_init_sock(struct sock *sk)
{
	struct inet_connection_sock *icsk = inet_csk(sk);

	tcp_init_sock(sk);

	icsk->icsk_af_ops = &ipv4_specific;

#ifdef CONFIG_TCP_MD5SIG
	tcp_sk(sk)->af_specific = &tcp_sock_ipv4_specific;
#endif

	return 0;
}
```

## 3. `bind => sk_prot->get_port` 检查端口是否可用

### 3.1. 先看定义

- 调用到`inet_csk_get_port`

```cpp
// net/ipv4/tcp_ipv4.c
struct proto tcp_prot = {
	...
	.get_port		= inet_csk_get_port,
	...
};
EXPORT_SYMBOL(tcp_prot);
```

### 3.2. inet_csk_get_port

- 没有端口，自动分配一个端口
- 有已经分配的端口就看是否可以复用，可以也可以返回
- 成功分配端口后就绑定socket和端口的关系

```cpp
/* Obtain a reference to a local port for the given sock,
 * if snum is zero it means select any available local port.
 * We try to allocate an odd port (and leave even ports for connect())
 */
int inet_csk_get_port(struct sock *sk, unsigned short snum)
{
	bool reuse = sk->sk_reuse && sk->sk_state != TCP_LISTEN;
	struct inet_hashinfo *hinfo = sk->sk_prot->h.hashinfo;
	int ret = 1, port = snum;
	struct inet_bind_hashbucket *head;
	struct net *net = sock_net(sk);
	struct inet_bind_bucket *tb = NULL;
	int l3mdev;

	l3mdev = inet_sk_bound_l3mdev(sk);

	// 没有端口，内核从合法端口内自动分配一个端口
	if (!port) {
		head = inet_csk_find_open_port(sk, &tb, &port);
		if (!head)
			return ret;
		if (!tb)
			goto tb_not_found;
		goto success;
	}

	// 从hash表查找端口信息
	head = &hinfo->bhash[inet_bhashfn(net, port,
					  hinfo->bhash_size)];
	spin_lock_bh(&head->lock);
	inet_bind_bucket_for_each(tb, &head->chain)
		if (net_eq(ib_net(tb), net) && tb->l3mdev == l3mdev &&
		    tb->port == port)
			goto tb_found;
tb_not_found:
	// 没找到，新建一个绑定，加入到hash表
	tb = inet_bind_bucket_create(hinfo->bind_bucket_cachep,
				     net, head, port, l3mdev);
	if (!tb)
		goto fail_unlock;
tb_found:
	// 找到了，如果可以复用，也成功返回
	if (!hlist_empty(&tb->owners)) {
		if (sk->sk_reuse == SK_FORCE_REUSE)
			goto success;

		if ((tb->fastreuse > 0 && reuse) ||
		    sk_reuseport_match(tb, sk))
			goto success;
		// 不是强制复用和快速复用等，进行绑定冲突判断
		if (inet_csk_bind_conflict(sk, tb, true, true))
			goto fail_unlock;
	}
success:
	inet_csk_update_fastreuse(tb, sk);

	// 将socket和hash表上的端口绑定
	if (!inet_csk(sk)->icsk_bind_hash)
		inet_bind_hash(sk, tb, port);
	WARN_ON(inet_csk(sk)->icsk_bind_hash != tb);
	ret = 0;

fail_unlock:
	spin_unlock_bh(&head->lock);
	return ret;
}
EXPORT_SYMBOL_GPL(inet_csk_get_port);
```

- `inet_csk_bind_conflict`进行绑定冲突判断

```cpp
/** 系统调用栈
inet_csk_bind_conflict(const struct sock * sk, const struct inet_bind_bucket * tb, bool relax, bool reuseport_ok) (net/ipv4/inet_connection_sock.c:185)
inet_csk_get_port(struct sock * sk, unsigned short snum) (net/ipv4/inet_connection_sock.c:409)
__inet_bind(struct sock * sk, struct sockaddr * uaddr, int addr_len, u32 flags) (net/ipv4/af_inet.c:525)
__sys_bind(int fd, struct sockaddr * umyaddr, int addrlen) (net/socket.c:1776)
__do_sys_bind(int addrlen, struct sockaddr * umyaddr, int fd) (net/socket.c:1787)
__se_sys_bind(long addrlen, long umyaddr, long fd) (net/socket.c:1785)
__x64_sys_bind(const struct pt_regs * regs) (net/socket.c:1785)
do_syscall_x64(int nr, struct pt_regs * regs) (arch/x86/entry/common.c:50)
do_syscall_64(struct pt_regs * regs, int nr) (arch/x86/entry/common.c:80)
entry_SYSCALL_64() (arch/x86/entry/entry_64.S:120)
fixed_percpu_data (Unknown Source:0)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
 */
int inet_csk_bind_conflict(const struct sock *sk,
				  const struct inet_bind_bucket *tb,
				  bool relax, bool reuseport_ok)
{
	struct sock *sk2;
	bool reuseport_cb_ok;
	bool reuse = sk->sk_reuse;
	bool reuseport = !!sk->sk_reuseport;
	struct sock_reuseport *reuseport_cb;
	kuid_t uid = sock_i_uid((struct sock *)sk);

	rcu_read_lock();
	reuseport_cb = rcu_dereference(sk->sk_reuseport_cb);
	/* paired with WRITE_ONCE() in __reuseport_(add|detach)_closed_sock */
	reuseport_cb_ok = !reuseport_cb || READ_ONCE(reuseport_cb->num_closed_socks);
	rcu_read_unlock();

	/*
	 * Unlike other sk lookup places we do not check
	 * for sk_net here, since _all_ the socks listed
	 * in tb->owners list belong to the same net - the
	 * one this bucket belongs to.
	 */

	sk_for_each_bound(sk2, &tb->owners) {
		int bound_dev_if2;

		if (sk == sk2)
			continue;
		bound_dev_if2 = READ_ONCE(sk2->sk_bound_dev_if);
		if ((!sk->sk_bound_dev_if ||
		     !bound_dev_if2 ||
		     sk->sk_bound_dev_if == bound_dev_if2)) {
			if (reuse && sk2->sk_reuse &&
			    sk2->sk_state != TCP_LISTEN) {
				if ((!relax ||
				     (!reuseport_ok &&
				      reuseport && sk2->sk_reuseport &&
				      reuseport_cb_ok &&
				      (sk2->sk_state == TCP_TIME_WAIT ||
				       uid_eq(uid, sock_i_uid(sk2))))) &&
				    inet_rcv_saddr_equal(sk, sk2, true))
					break;
			} else if (!reuseport_ok ||
				   !reuseport || !sk2->sk_reuseport ||
				   !reuseport_cb_ok ||
				   (sk2->sk_state != TCP_TIME_WAIT &&
				    !uid_eq(uid, sock_i_uid(sk2)))) {
				// 这里是判断不能复用或tcp状态不是timewait才判断
				// 说明timewait状态是可以直接进行绑定源端口的

				// 端口已经被占用就会走到这个位置break掉，sk2有值，返回有冲突
				if (inet_rcv_saddr_equal(sk, sk2, true))
					break;
			}
		}
	}
	return sk2 != NULL;
}
```

## 4. `connect => ops->connect => inet_stream_connect => sk_prot->connect`

### 4.1. 先看定义

- 调用到`tcp_v4_connect`

```cpp
// net/ipv4/tcp_ipv4.c
struct proto tcp_prot = {
	...
	.connect		= tcp_v4_connect,
	...
};
EXPORT_SYMBOL(tcp_prot);
```

### 4.2. 发起连接的过程

```cpp
// net/ipv4/tcp_ipv4.c
/* This will initiate an outgoing connection. */
int tcp_v4_connect(struct sock *sk, struct sockaddr *uaddr, int addr_len)
{
	struct sockaddr_in *usin = (struct sockaddr_in *)uaddr;
	struct inet_sock *inet = inet_sk(sk);
	struct tcp_sock *tp = tcp_sk(sk);
	__be16 orig_sport, orig_dport;
	__be32 daddr, nexthop;
	struct flowi4 *fl4;
	struct rtable *rt;
	int err;
	struct ip_options_rcu *inet_opt;
	struct inet_timewait_death_row *tcp_death_row = sock_net(sk)->ipv4.tcp_death_row;

	if (addr_len < sizeof(struct sockaddr_in))
		return -EINVAL;

	if (usin->sin_family != AF_INET)
		return -EAFNOSUPPORT;

	nexthop = daddr = usin->sin_addr.s_addr;
	inet_opt = rcu_dereference_protected(inet->inet_opt,
					     lockdep_sock_is_held(sk));
	if (inet_opt && inet_opt->opt.srr) {
		if (!daddr)
			return -EINVAL;
		nexthop = inet_opt->opt.faddr;
	}

	orig_sport = inet->inet_sport;
	orig_dport = usin->sin_port;
	fl4 = &inet->cork.fl.u.ip4;
	// 根据路由找源地址，找网卡，使用网卡的ip
	// 端口为0时，这里还不会分配端口只找ip
	rt = ip_route_connect(fl4, nexthop, inet->inet_saddr,
			      sk->sk_bound_dev_if, IPPROTO_TCP, orig_sport,
			      orig_dport, sk);
	if (IS_ERR(rt)) {
		err = PTR_ERR(rt);
		if (err == -ENETUNREACH)
			IP_INC_STATS(sock_net(sk), IPSTATS_MIB_OUTNOROUTES);
		return err;
	}

	if (rt->rt_flags & (RTCF_MULTICAST | RTCF_BROADCAST)) {
		ip_rt_put(rt);
		return -ENETUNREACH;
	}

	if (!inet_opt || !inet_opt->opt.srr)
		daddr = fl4->daddr;

	if (!inet->inet_saddr)
		inet->inet_saddr = fl4->saddr;
	sk_rcv_saddr_set(sk, inet->inet_saddr);

	if (tp->rx_opt.ts_recent_stamp && inet->inet_daddr != daddr) {
		/* Reset inherited state */
		tp->rx_opt.ts_recent	   = 0;
		tp->rx_opt.ts_recent_stamp = 0;
		if (likely(!tp->repair))
			WRITE_ONCE(tp->write_seq, 0);
	}

	inet->inet_dport = usin->sin_port;
	sk_daddr_set(sk, daddr);

	inet_csk(sk)->icsk_ext_hdr_len = 0;
	if (inet_opt)
		inet_csk(sk)->icsk_ext_hdr_len = inet_opt->opt.optlen;

	tp->rx_opt.mss_clamp = TCP_MSS_DEFAULT;

	/* Socket identity is still unknown (sport may be zero).
	 * However we set state to SYN-SENT and not releasing socket
	 * lock select source port, enter ourselves into the hash tables and
	 * complete initialization after this.
	 */
	tcp_set_state(sk, TCP_SYN_SENT);
	// 这里对于没有源端口（源端口为0）的会进行端口绑定
	err = inet_hash_connect(tcp_death_row, sk);
	if (err)
		goto failure;

	sk_set_txhash(sk);

	rt = ip_route_newports(fl4, rt, orig_sport, orig_dport,
			       inet->inet_sport, inet->inet_dport, sk);
	if (IS_ERR(rt)) {
		err = PTR_ERR(rt);
		rt = NULL;
		goto failure;
	}
	/* OK, now commit destination to socket.  */
	sk->sk_gso_type = SKB_GSO_TCPV4;
	sk_setup_caps(sk, &rt->dst);
	rt = NULL;

	if (likely(!tp->repair)) {
		if (!tp->write_seq)
			WRITE_ONCE(tp->write_seq,
				   secure_tcp_seq(inet->inet_saddr,
						  inet->inet_daddr,
						  inet->inet_sport,
						  usin->sin_port));
		tp->tsoffset = secure_tcp_ts_off(sock_net(sk),
						 inet->inet_saddr,
						 inet->inet_daddr);
	}

	inet->inet_id = prandom_u32();

	if (tcp_fastopen_defer_connect(sk, &err))
		return err;
	if (err)
		goto failure;

	// 发起sync包
	err = tcp_connect(sk);

	if (err)
		goto failure;

	return 0;

failure:
	/*
	 * This unhashes the socket and releases the local port,
	 * if necessary.
	 */
	tcp_set_state(sk, TCP_CLOSE);
	ip_rt_put(rt);
	sk->sk_route_caps = 0;
	inet->inet_dport = 0;
	return err;
}
EXPORT_SYMBOL(tcp_v4_connect);
```

#### 1) `inet_hash_connect` 绑定端口

```cpp
// net/ipv4/inet_hashtables.c
/*
 * Bind a port for a connect operation and hash it.
 */
int inet_hash_connect(struct inet_timewait_death_row *death_row,
		      struct sock *sk)
{
	u64 port_offset = 0;

	if (!inet_sk(sk)->inet_num)
		port_offset = inet_sk_port_offset(sk);
	return __inet_hash_connect(death_row, sk, port_offset,
				   __inet_check_established);
}
EXPORT_SYMBOL_GPL(inet_hash_connect);
```

- 直接调用到`__inet_hash_connect`

```cpp
/*
__inet_hash_connect(struct inet_timewait_death_row * death_row, struct sock * sk, u64 port_offset, int (*)(struct inet_timewait_death_row *, struct sock *, __u16, struct inet_timewait_sock **) check_established) (net/ipv4/inet_hashtables.c:727)
inet_hash_connect(struct inet_timewait_death_row * death_row, struct sock * sk) (net/ipv4/inet_hashtables.c:825)
tcp_v4_connect(struct sock * sk, struct sockaddr * uaddr, int addr_len) (net/ipv4/tcp_ipv4.c:276)
__inet_stream_connect(struct socket * sock, struct sockaddr * uaddr, int addr_len, int flags, int is_sendmsg) (net/ipv4/af_inet.c:660)
inet_stream_connect(struct socket * sock, struct sockaddr * uaddr, int addr_len, int flags) (net/ipv4/af_inet.c:724)
__sys_connect(int fd, struct sockaddr * uservaddr, int addrlen) (net/socket.c:1996)
__do_sys_connect(int addrlen, struct sockaddr * uservaddr, int fd) (net/socket.c:2006)
__se_sys_connect(long addrlen, long uservaddr, long fd) (net/socket.c:2003)
__x64_sys_connect(const struct pt_regs * regs) (net/socket.c:2003)
do_syscall_x64(int nr, struct pt_regs * regs) (arch/x86/entry/common.c:50)
do_syscall_64(struct pt_regs * regs, int nr) (arch/x86/entry/common.c:80)
entry_SYSCALL_64() (arch/x86/entry/entry_64.S:120)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
fixed_percpu_data (Unknown Source:0)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
fixed_percpu_data (Unknown Source:0)
[Unknown/Just-In-Time compiled code] (Unknown Source:0)
 */
int __inet_hash_connect(struct inet_timewait_death_row *death_row,
		struct sock *sk, u64 port_offset,
		int (*check_established)(struct inet_timewait_death_row *,
			struct sock *, __u16, struct inet_timewait_sock **))
{
	struct inet_hashinfo *hinfo = death_row->hashinfo;
	struct inet_timewait_sock *tw = NULL;
	struct inet_bind_hashbucket *head;
	int port = inet_sk(sk)->inet_num;
	struct net *net = sock_net(sk);
	struct inet_bind_bucket *tb;
	u32 remaining, offset;
	int ret, i, low, high;
	int l3mdev;
	u32 index;

	if (port) {
		// 有端口就在bind的hash表中查找此端口
		head = &hinfo->bhash[inet_bhashfn(net, port,
						  hinfo->bhash_size)];
		tb = inet_csk(sk)->icsk_bind_hash;
		spin_lock_bh(&head->lock);
		if (sk_head(&tb->owners) == sk && !sk->sk_bind_node.next) {
			inet_ehash_nolisten(sk, NULL, NULL);
			spin_unlock_bh(&head->lock);
			return 0;
		}
		spin_unlock(&head->lock);
		/* No definite answer... Walk to established hash table */
		ret = check_established(death_row, sk, port, NULL);
		local_bh_enable();
		return ret;
	}

	l3mdev = inet_sk_bound_l3mdev(sk);

	inet_get_local_port_range(net, &low, &high);
	high++; /* [32768, 60999] -> [32768, 61000[ */
	remaining = high - low;
	if (likely(remaining > 1))
		remaining &= ~1U;

	net_get_random_once(table_perturb,
			    INET_TABLE_PERTURB_SIZE * sizeof(*table_perturb));
	index = port_offset & (INET_TABLE_PERTURB_SIZE - 1);

	offset = READ_ONCE(table_perturb[index]) + (port_offset >> 32);
	offset %= remaining;

	/* In first pass we try ports of @low parity.
	 * inet_csk_get_port() does the opposite choice.
	 */
	offset &= ~1U;
other_parity_scan:
	port = low + offset;
	// 没端口就开始进行随机查找端口
	for (i = 0; i < remaining; i += 2, port += 2) {
		if (unlikely(port >= high))
			port -= remaining;
		// 排除保留端口
		if (inet_is_local_reserved_port(net, port))
			continue;
		// 此端口先在bind的hash表中查找一下对应的链表
		head = &hinfo->bhash[inet_bhashfn(net, port,
						  hinfo->bhash_size)];
		spin_lock_bh(&head->lock);

		/* Does not bother with rcv_saddr checks, because
		 * the established check is already unique enough.
		 */
		inet_bind_bucket_for_each(tb, &head->chain) {
			if (net_eq(ib_net(tb), net) && tb->l3mdev == l3mdev &&
			    tb->port == port) {
				if (tb->fastreuse >= 0 ||
				    tb->fastreuseport >= 0)
					goto next_port;
				WARN_ON(hlist_empty(&tb->owners));
				if (!check_established(death_row, sk,
						       port, &tw))
					goto ok;
				goto next_port;
			}
		}

		// 这里是说明此源端口没有在bind的hash表中，新建一个此端口的hash桶
		tb = inet_bind_bucket_create(hinfo->bind_bucket_cachep,
					     net, head, port, l3mdev);
		if (!tb) {
			spin_unlock_bh(&head->lock);
			return -ENOMEM;
		}
		tb->fastreuse = -1;
		tb->fastreuseport = -1;
		goto ok;
next_port:
		spin_unlock_bh(&head->lock);
		cond_resched();
	}

	offset++;
	if ((offset & 1) && remaining > 1)
		goto other_parity_scan;

	return -EADDRNOTAVAIL;

ok:
	/* Here we want to add a little bit of randomness to the next source
	 * port that will be chosen. We use a max() with a random here so that
	 * on low contention the randomness is maximal and on high contention
	 * it may be inexistent.
	 */
	i = max_t(int, i, (prandom_u32() & 7) * 2);
	WRITE_ONCE(table_perturb[index], READ_ONCE(table_perturb[index]) + i + 2);

	/* Head lock still held and bh's disabled */
	// 在找到的bind表中此端口对应的tb表中存一下sk
	inet_bind_hash(sk, tb, port);
	if (sk_unhashed(sk)) {
		inet_sk(sk)->inet_sport = htons(port);
		// 在establish的表中存一下
		inet_ehash_nolisten(sk, (struct sock *)tw, NULL);
	}
	if (tw)
		inet_twsk_bind_unhash(tw, hinfo);
	spin_unlock(&head->lock);
	if (tw)
		inet_twsk_deschedule_put(tw);
	local_bh_enable();
	return 0;
}
```

# 五、tcp处理网卡收到的包

## 1. 注册tcp的recv到ip层协议栈

```cpp
// net/ipv4/af_inet.c
static const struct net_protocol tcp_protocol = {
	.handler	=	tcp_v4_rcv,
	.err_handler	=	tcp_v4_err,
	.no_policy	=	1,
	.icmp_strict_tag_validation = 1,
};
...
static int __init inet_init(void)
{
...
	if (inet_add_protocol(&tcp_protocol, IPPROTO_TCP) < 0)
		pr_crit("%s: Cannot add TCP protocol\n", __func__);
...
}
```

## 2. tcp_v4_rcv 收到包后的处理

```cpp
// net/ipv4/tcp_ipv4.c
/*
 *	From tcp_input.c
 */

int tcp_v4_rcv(struct sk_buff *skb)
{
	struct net *net = dev_net(skb->dev);
	enum skb_drop_reason drop_reason;
	int sdif = inet_sdif(skb);
	int dif = inet_iif(skb);
	const struct iphdr *iph;
	const struct tcphdr *th;
	bool refcounted;
	struct sock *sk;
	int ret;

	drop_reason = SKB_DROP_REASON_NOT_SPECIFIED;
	if (skb->pkt_type != PACKET_HOST)
		goto discard_it;

	/* Count it even if it's bad */
	__TCP_INC_STATS(net, TCP_MIB_INSEGS);

	if (!pskb_may_pull(skb, sizeof(struct tcphdr)))
		goto discard_it;

	th = (const struct tcphdr *)skb->data;

	if (unlikely(th->doff < sizeof(struct tcphdr) / 4)) {
		drop_reason = SKB_DROP_REASON_PKT_TOO_SMALL;
		goto bad_packet;
	}
	if (!pskb_may_pull(skb, th->doff * 4))
		goto discard_it;

	/* An explanation is required here, I think.
	 * Packet length and doff are validated by header prediction,
	 * provided case of th->doff==0 is eliminated.
	 * So, we defer the checks. */

	if (skb_checksum_init(skb, IPPROTO_TCP, inet_compute_pseudo))
		goto csum_error;

	th = (const struct tcphdr *)skb->data;
	iph = ip_hdr(skb);
lookup:
	// 拿到包后，根据目的地址和源地址查找有没有socket
	sk = __inet_lookup_skb(&tcp_hashinfo, skb, __tcp_hdrlen(th), th->source,
			       th->dest, sdif, &refcounted);

	// 没查到就走no_tcp_socket
	if (!sk)
		goto no_tcp_socket;

process:
	if (sk->sk_state == TCP_TIME_WAIT)
		goto do_time_wait;

	if (sk->sk_state == TCP_NEW_SYN_RECV) {
		struct request_sock *req = inet_reqsk(sk);
		bool req_stolen = false;
		struct sock *nsk;

		sk = req->rsk_listener;
		if (!xfrm4_policy_check(sk, XFRM_POLICY_IN, skb))
			drop_reason = SKB_DROP_REASON_XFRM_POLICY;
		else
			drop_reason = tcp_inbound_md5_hash(sk, skb,
						   &iph->saddr, &iph->daddr,
						   AF_INET, dif, sdif);
		if (unlikely(drop_reason)) {
			sk_drops_add(sk, skb);
			reqsk_put(req);
			goto discard_it;
		}
		if (tcp_checksum_complete(skb)) {
			reqsk_put(req);
			goto csum_error;
		}
		if (unlikely(sk->sk_state != TCP_LISTEN)) {
			nsk = reuseport_migrate_sock(sk, req_to_sk(req), skb);
			if (!nsk) {
				inet_csk_reqsk_queue_drop_and_put(sk, req);
				goto lookup;
			}
			sk = nsk;
			/* reuseport_migrate_sock() has already held one sk_refcnt
			 * before returning.
			 */
		} else {
			/* We own a reference on the listener, increase it again
			 * as we might lose it too soon.
			 */
			sock_hold(sk);
		}
		refcounted = true;
		nsk = NULL;
		if (!tcp_filter(sk, skb)) {
			th = (const struct tcphdr *)skb->data;
			iph = ip_hdr(skb);
			tcp_v4_fill_cb(skb, iph, th);
			nsk = tcp_check_req(sk, skb, req, false, &req_stolen);
		} else {
			drop_reason = SKB_DROP_REASON_SOCKET_FILTER;
		}
		if (!nsk) {
			reqsk_put(req);
			if (req_stolen) {
				/* Another cpu got exclusive access to req
				 * and created a full blown socket.
				 * Try to feed this packet to this socket
				 * instead of discarding it.
				 */
				tcp_v4_restore_cb(skb);
				sock_put(sk);
				goto lookup;
			}
			goto discard_and_relse;
		}
		nf_reset_ct(skb);
		if (nsk == sk) {
			reqsk_put(req);
			tcp_v4_restore_cb(skb);
		} else if (tcp_child_process(sk, nsk, skb)) {
			tcp_v4_send_reset(nsk, skb);
			goto discard_and_relse;
		} else {
			sock_put(sk);
			return 0;
		}
	}

	if (static_branch_unlikely(&ip4_min_ttl)) {
		/* min_ttl can be changed concurrently from do_ip_setsockopt() */
		if (unlikely(iph->ttl < READ_ONCE(inet_sk(sk)->min_ttl))) {
			__NET_INC_STATS(net, LINUX_MIB_TCPMINTTLDROP);
			goto discard_and_relse;
		}
	}

	if (!xfrm4_policy_check(sk, XFRM_POLICY_IN, skb)) {
		drop_reason = SKB_DROP_REASON_XFRM_POLICY;
		goto discard_and_relse;
	}

	drop_reason = tcp_inbound_md5_hash(sk, skb, &iph->saddr,
					   &iph->daddr, AF_INET, dif, sdif);
	if (drop_reason)
		goto discard_and_relse;

	nf_reset_ct(skb);

	if (tcp_filter(sk, skb)) {
		drop_reason = SKB_DROP_REASON_SOCKET_FILTER;
		goto discard_and_relse;
	}
	th = (const struct tcphdr *)skb->data;
	iph = ip_hdr(skb);
	tcp_v4_fill_cb(skb, iph, th);

	skb->dev = NULL;

	if (sk->sk_state == TCP_LISTEN) {
		ret = tcp_v4_do_rcv(sk, skb);
		goto put_and_return;
	}

	sk_incoming_cpu_update(sk);

	bh_lock_sock_nested(sk);
	tcp_segs_in(tcp_sk(sk), skb);
	ret = 0;
	if (!sock_owned_by_user(sk)) {
		ret = tcp_v4_do_rcv(sk, skb);
	} else {
		if (tcp_add_backlog(sk, skb, &drop_reason))
			goto discard_and_relse;
	}
	bh_unlock_sock(sk);

put_and_return:
	if (refcounted)
		sock_put(sk);

	return ret;

no_tcp_socket:
	drop_reason = SKB_DROP_REASON_NO_SOCKET;
	if (!xfrm4_policy_check(NULL, XFRM_POLICY_IN, skb))
		goto discard_it;

	tcp_v4_fill_cb(skb, iph, th);

	if (tcp_checksum_complete(skb)) {
csum_error:
		drop_reason = SKB_DROP_REASON_TCP_CSUM;
		trace_tcp_bad_csum(skb);
		__TCP_INC_STATS(net, TCP_MIB_CSUMERRORS);
bad_packet:
		__TCP_INC_STATS(net, TCP_MIB_INERRS);
	} else {
		tcp_v4_send_reset(NULL, skb);
	}

discard_it:
	SKB_DR_OR(drop_reason, NOT_SPECIFIED);
	/* Discard frame. */
	kfree_skb_reason(skb, drop_reason);
	return 0;

discard_and_relse:
	sk_drops_add(sk, skb);
	if (refcounted)
		sock_put(sk);
	goto discard_it;

do_time_wait:
	if (!xfrm4_policy_check(NULL, XFRM_POLICY_IN, skb)) {
		drop_reason = SKB_DROP_REASON_XFRM_POLICY;
		inet_twsk_put(inet_twsk(sk));
		goto discard_it;
	}

	tcp_v4_fill_cb(skb, iph, th);

	if (tcp_checksum_complete(skb)) {
		inet_twsk_put(inet_twsk(sk));
		goto csum_error;
	}
	switch (tcp_timewait_state_process(inet_twsk(sk), skb, th)) {
	case TCP_TW_SYN: {
		struct sock *sk2 = inet_lookup_listener(dev_net(skb->dev),
							&tcp_hashinfo, skb,
							__tcp_hdrlen(th),
							iph->saddr, th->source,
							iph->daddr, th->dest,
							inet_iif(skb),
							sdif);
		if (sk2) {
			inet_twsk_deschedule_put(inet_twsk(sk));
			sk = sk2;
			tcp_v4_restore_cb(skb);
			refcounted = false;
			goto process;
		}
	}
		/* to ACK */
		fallthrough;
	case TCP_TW_ACK:
		tcp_v4_timewait_ack(sk, skb);
		break;
	case TCP_TW_RST:
		tcp_v4_send_reset(sk, skb);
		inet_twsk_deschedule_put(inet_twsk(sk));
		goto discard_it;
	case TCP_TW_SUCCESS:;
	}
	goto discard_it;
}
```

## 3. tcp_v4_do_rcv socket为TCP_LISTEN状态（服务端监听socket）

```cpp
// net/ipv4/tcp_ipv4.c
INDIRECT_CALLABLE_DECLARE(struct dst_entry *ipv4_dst_check(struct dst_entry *,
							   u32));
/* The socket must have it's spinlock held when we get
 * here, unless it is a TCP_LISTEN socket.
 *
 * We have a potential double-lock case here, so even when
 * doing backlog processing we use the BH locking scheme.
 * This is because we cannot sleep with the original spinlock
 * held.
 */
int tcp_v4_do_rcv(struct sock *sk, struct sk_buff *skb)
{
	enum skb_drop_reason reason;
	struct sock *rsk;

	if (sk->sk_state == TCP_ESTABLISHED) { /* Fast path */
		struct dst_entry *dst;

		dst = rcu_dereference_protected(sk->sk_rx_dst,
						lockdep_sock_is_held(sk));

		sock_rps_save_rxhash(sk, skb);
		sk_mark_napi_id(sk, skb);
		if (dst) {
			if (sk->sk_rx_dst_ifindex != skb->skb_iif ||
			    !INDIRECT_CALL_1(dst->ops->check, ipv4_dst_check,
					     dst, 0)) {
				RCU_INIT_POINTER(sk->sk_rx_dst, NULL);
				dst_release(dst);
			}
		}
		tcp_rcv_established(sk, skb);
		return 0;
	}

	reason = SKB_DROP_REASON_NOT_SPECIFIED;
	if (tcp_checksum_complete(skb))
		goto csum_err;

	if (sk->sk_state == TCP_LISTEN) {
		struct sock *nsk = tcp_v4_cookie_check(sk, skb);

		if (!nsk)
			goto discard;
		if (nsk != sk) {
			if (tcp_child_process(sk, nsk, skb)) {
				rsk = nsk;
				goto reset;
			}
			return 0;
		}
	} else
		sock_rps_save_rxhash(sk, skb);

	if (tcp_rcv_state_process(sk, skb)) {
		rsk = sk;
		goto reset;
	}
	return 0;

reset:
	tcp_v4_send_reset(rsk, skb);
discard:
	kfree_skb_reason(skb, reason);
	/* Be careful here. If this function gets more complicated and
	 * gcc suffers from register pressure on the x86, sk (in %ebx)
	 * might be destroyed here. This current version compiles correctly,
	 * but you have been warned.
	 */
	return 0;

csum_err:
	reason = SKB_DROP_REASON_TCP_CSUM;
	trace_tcp_bad_csum(skb);
	TCP_INC_STATS(sock_net(sk), TCP_MIB_CSUMERRORS);
	TCP_INC_STATS(sock_net(sk), TCP_MIB_INERRS);
	goto discard;
}
EXPORT_SYMBOL(tcp_v4_do_rcv);
```

- tcp_rcv_state_process处理

```cpp
/*
 *	This function implements the receiving procedure of RFC 793 for
 *	all states except ESTABLISHED and TIME_WAIT.
 *	It's called from both tcp_v4_rcv and tcp_v6_rcv and should be
 *	address independent.
 */

int tcp_rcv_state_process(struct sock *sk, struct sk_buff *skb)
{
	...
	switch (sk->sk_state) {
		...
	case TCP_LISTEN:
		// TCP_LISTEN状态，说明此socket为服务端的监听socket
		// 收到客户端的ack，不合理，外部会回复rst
		if (th->ack)
			return 1;

		// 收到客户端的rst，直接丢包
		if (th->rst) {
			SKB_DR_SET(reason, TCP_RESET);
			goto discard;
		}
		// 收到syn包，说明是客户端请求连接上来
		if (th->syn) {
			if (th->fin) {
				SKB_DR_SET(reason, TCP_FLAGS);
				goto discard;
			}
			/* It is possible that we process SYN packets from backlog,
			 * so we need to make sure to disable BH and RCU right there.
			 */
			rcu_read_lock();
			local_bh_disable();
			acceptable = icsk->icsk_af_ops->conn_request(sk, skb) >= 0;
			local_bh_enable();
			rcu_read_unlock();

			if (!acceptable)
				return 1;
			consume_skb(skb);
			return 0;
		}
		SKB_DR_SET(reason, TCP_FLAGS);
		goto discard;
		...
	}
	...
discard:
		tcp_drop_reason(sk, skb, reason);
	}
	return 0;

consume:
	__kfree_skb(skb);
	return 0;
}
EXPORT_SYMBOL(tcp_rcv_state_process);
```

- 在`icsk->icsk_af_ops->conn_request`中处理，注册在下面的位置

```cpp
// net/ipv4/tcp_ipv4.c
/* 堆栈信息
tcp_v4_init_sock(struct sock * sk) (net/ipv4/tcp_ipv4.c:2213)
inet_create(int kern, int protocol, struct socket * sock, struct net * net) (net/ipv4/af_inet.c:377)
inet_create(struct net * net, struct socket * sock, int protocol, int kern) (net/ipv4/af_inet.c:245)
__sock_create(struct net * net, int family, int type, int protocol, struct socket ** res, int kern) (net/socket.c:1515)
sock_create(struct socket ** res, int protocol, int type, int family) (net/socket.c:1566)
__sys_socket_create(int protocol, int type, int family) (net/socket.c:1603)
__sys_socket(int family, int type, int protocol) (net/socket.c:1636)
__do_sys_socket(int protocol, int type, int family) (net/socket.c:1649)
socket系统调用
*/
/* NOTE: A lot of things set to zero explicitly by call to
 *       sk_alloc() so need not be done here.
 */
static int tcp_v4_init_sock(struct sock *sk)
{
	struct inet_connection_sock *icsk = inet_csk(sk);

	tcp_init_sock(sk);

	icsk->icsk_af_ops = &ipv4_specific;

#ifdef CONFIG_TCP_MD5SIG
	tcp_sk(sk)->af_specific = &tcp_sock_ipv4_specific;
#endif

	return 0;
}
```

# 六、tcp options

## 1. 什么是tcp options

![](imgs/2023-12-12-01.png)

- tcp头部固定长度为20字节，最大为60字节，此包为40字节，多出来的20字节就是Options
- options满足tlv格式，其中length包含kind、length本身（固定一个字节）、value的总长度
- tcp options相关定义

```cpp
// include/net/tcp.h
/*
 *	TCP option
 */
// 写入到tcp option的kind字段中的值
#define TCPOPT_NOP		1	/* Padding */
#define TCPOPT_EOL		0	/* End of options */
#define TCPOPT_MSS		2	/* Segment size negotiating */
#define TCPOPT_WINDOW		3	/* Window scaling */
#define TCPOPT_SACK_PERM        4       /* SACK Permitted */
#define TCPOPT_SACK             5       /* SACK Block */
#define TCPOPT_TIMESTAMP	8	/* Better RTT estimations/PAWS */
#define TCPOPT_MD5SIG		19	/* MD5 Signature (RFC2385) */
#define TCPOPT_FASTOPEN		34	/* Fast open (RFC7413) */
#define TCPOPT_EXP		254	/* Experimental */
/* Magic number to be after the option value for sharing TCP
 * experimental options. See draft-ietf-tcpm-experimental-options-00.txt
 */
#define TCPOPT_FASTOPEN_MAGIC	0xF989
#define TCPOPT_SMC_MAGIC	0xE2D4C3D9

/*
 *     TCP option lengths
 */
// 对应tcp option的长度，写入到tcp option的len中，包含kind、len、value长度
#define TCPOLEN_MSS            4
#define TCPOLEN_WINDOW         3
#define TCPOLEN_SACK_PERM      2
#define TCPOLEN_TIMESTAMP      10
#define TCPOLEN_MD5SIG         18
#define TCPOLEN_FASTOPEN_BASE  2
#define TCPOLEN_EXP_FASTOPEN_BASE  4
#define TCPOLEN_EXP_SMC_BASE   6

/* But this is what stacks really send out. */
// 这个是用于占位，是len的4字节对齐后的长度，不足的会在前面使用TCPOPT_NOP添加Padding
#define TCPOLEN_TSTAMP_ALIGNED		12
#define TCPOLEN_WSCALE_ALIGNED		4
#define TCPOLEN_SACKPERM_ALIGNED	4
#define TCPOLEN_SACK_BASE		2
#define TCPOLEN_SACK_BASE_ALIGNED	4
#define TCPOLEN_SACK_PERBLOCK		8
#define TCPOLEN_MD5SIG_ALIGNED		20
#define TCPOLEN_MSS_ALIGNED		4
#define TCPOLEN_EXP_SMC_BASE_ALIGNED	8
```

## 2. tcp options在内核中如何生成的

tcp发送数据包的函数为`tcp_transmit_skb`

```cpp
// net/ipv4/tcp_output.c
static int tcp_transmit_skb(struct sock *sk, struct sk_buff *skb, int clone_it,
			    gfp_t gfp_mask)
{
	return __tcp_transmit_skb(sk, skb, clone_it, gfp_mask,
				  tcp_sk(sk)->rcv_nxt);
}
```

- 构造数据包的过程中会计算头部保留一部分空间给`tcp_options`

```cpp
// net/ipv4/tcp_output.c
/* This routine actually transmits TCP packets queued in by
 * tcp_do_sendmsg().  This is used by both the initial
 * transmission and possible later retransmissions.
 * All SKB's seen here are completely headerless.  It is our
 * job to build the TCP header, and pass the packet down to
 * IP so it can do the same plus pass the packet off to the
 * device.
 *
 * We are working here with either a clone of the original
 * SKB, or a fresh unique copy made by the retransmit engine.
 */
static int __tcp_transmit_skb(struct sock *sk, struct sk_buff *skb,
			      int clone_it, gfp_t gfp_mask, u32 rcv_nxt)
{
	...
	struct tcp_out_options opts;
	unsigned int tcp_options_size, tcp_header_size;
    ...
	memset(&opts, 0, sizeof(opts));

	if (unlikely(tcb->tcp_flags & TCPHDR_SYN)) {
		tcp_options_size = tcp_syn_options(sk, skb, &opts, &md5);
	} else {
		tcp_options_size = tcp_established_options(sk, skb, &opts,
							   &md5);
		/* Force a PSH flag on all (GSO) packets to expedite GRO flush
		 * at receiver : This slightly improve GRO performance.
		 * Note that we do not force the PSH flag for non GSO packets,
		 * because they might be sent under high congestion events,
		 * and in this case it is better to delay the delivery of 1-MSS
		 * packets and thus the corresponding ACK packet that would
		 * release the following packet.
		 */
		if (tcp_skb_pcount(skb) > 1)
			tcb->tcp_flags |= TCPHDR_PSH;
	}
	tcp_header_size = tcp_options_size + sizeof(struct tcphdr);
    ...
	skb_push(skb, tcp_header_size);
	skb_reset_transport_header(skb);

	skb_orphan(skb);
	skb->sk = sk;
	skb->destructor = skb_is_tcp_pure_ack(skb) ? __sock_wfree : tcp_wfree;
	refcount_add(skb->truesize, &sk->sk_wmem_alloc);

	skb_set_dst_pending_confirm(skb, sk->sk_dst_pending_confirm);

    // 构造tcp头部信息
	/* Build TCP header and checksum it. */
	th = (struct tcphdr *)skb->data;
	th->source		= inet->inet_sport;
	th->dest		= inet->inet_dport;
	th->seq			= htonl(tcb->seq);
	th->ack_seq		= htonl(rcv_nxt);
	*(((__be16 *)th) + 6)	= htons(((tcp_header_size >> 2) << 12) |
					tcb->tcp_flags);

	th->check		= 0;
	th->urg_ptr		= 0;
    ...
	tcp_options_write(th, tp, &opts);
    ...
	/* BPF prog is the last one writing header option */
	bpf_skops_write_hdr_opt(sk, skb, NULL, NULL, 0, &opts);
    ...
    // 添加到发送队列
	tcp_add_tx_delay(skb, tp);

	err = INDIRECT_CALL_INET(icsk->icsk_af_ops->queue_xmit,
				 inet6_csk_xmit, ip_queue_xmit,
				 sk, skb, &inet->cork.fl);

	if (unlikely(err > 0)) {
		tcp_enter_cwr(sk);
		err = net_xmit_eval(err);
	}
	if (!err && oskb) {
		tcp_update_skb_after_send(sk, oskb, prior_wstamp);
		tcp_rate_skb_sent(sk, oskb);
	}
	return err;
}
```

- `tcp_options_write`用于写入options
- 上面的计算options头部大小分为两个阶段，一个是syn包，一个是建立时，也就是三次握手的最后一个ack包
- bpf存在接口可以进行添加options，但是bpf的这个接口仅在高版本内核存在，4.19.181内核没有
- 先看tcp option的定义

```cpp
// net/ipv4/tcp_output.c
// 这个只是定义在OPTIONS的bit位，非tcp option中的kind
#define OPTION_SACK_ADVERTISE	BIT(0)
#define OPTION_TS		BIT(1)
#define OPTION_MD5		BIT(2)
#define OPTION_WSCALE		BIT(3)
#define OPTION_FAST_OPEN_COOKIE	BIT(8)
#define OPTION_SMC		BIT(9)
#define OPTION_MPTCP		BIT(10)
...
struct tcp_out_options {
	u16 options;		/* bit field of OPTION_* */
	u16 mss;		/* 0 to disable */
	u8 ws;			/* window scale, 0 to disable */
	u8 num_sack_blocks;	/* number of SACK blocks to include */
	u8 hash_size;		/* bytes in hash_location */
	u8 bpf_opt_len;		/* length of BPF hdr option */
	__u8 *hash_location;	/* temporary pointer, overloaded */
	__u32 tsval, tsecr;	/* need to include OPTION_TS */
	struct tcp_fastopen_cookie *fastopen_cookie;	/* Fast open cookie */
	struct mptcp_out_options mptcp;
};
```

- 查看设置tcp option的地方

```cpp
// include/net/tcp.h
#define MAX_TCP_OPTION_SPACE 40

// net/ipv4/tcp_output.c
/* Compute TCP options for SYN packets. This is not the final
 * network wire format yet.
 */
// 返回options占用了多少字节
static unsigned int tcp_syn_options(struct sock *sk, struct sk_buff *skb,
				struct tcp_out_options *opts,
				struct tcp_md5sig_key **md5)
{
	struct tcp_sock *tp = tcp_sk(sk);
	unsigned int remaining = MAX_TCP_OPTION_SPACE;
	struct tcp_fastopen_request *fastopen = tp->fastopen_req;

	*md5 = NULL;
#ifdef CONFIG_TCP_MD5SIG
	if (static_branch_unlikely(&tcp_md5_needed) &&
	    rcu_access_pointer(tp->md5sig_info)) {
		*md5 = tp->af_specific->md5_lookup(sk, sk);
		if (*md5) {
			opts->options |= OPTION_MD5;
			remaining -= TCPOLEN_MD5SIG_ALIGNED;
		}
	}
#endif

	/* We always get an MSS option.  The option bytes which will be seen in
	 * normal data packets should timestamps be used, must be in the MSS
	 * advertised.  But we subtract them from tp->mss_cache so that
	 * calculations in tcp_sendmsg are simpler etc.  So account for this
	 * fact here if necessary.  If we don't do this correctly, as a
	 * receiver we won't recognize data packets as being full sized when we
	 * should, and thus we won't abide by the delayed ACK rules correctly.
	 * SACKs don't matter, we never delay an ACK when we have any of those
	 * going out.  */
	opts->mss = tcp_advertise_mss(sk);
	remaining -= TCPOLEN_MSS_ALIGNED;

	if (likely(READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_timestamps) && !*md5)) {
		opts->options |= OPTION_TS;
		opts->tsval = tcp_skb_timestamp(skb) + tp->tsoffset;
		opts->tsecr = tp->rx_opt.ts_recent;
		remaining -= TCPOLEN_TSTAMP_ALIGNED;
	}
	if (likely(READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_window_scaling))) {
		opts->ws = tp->rx_opt.rcv_wscale;
		opts->options |= OPTION_WSCALE;
		remaining -= TCPOLEN_WSCALE_ALIGNED;
	}
	if (likely(READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_sack))) {
		opts->options |= OPTION_SACK_ADVERTISE;
		if (unlikely(!(OPTION_TS & opts->options)))
			remaining -= TCPOLEN_SACKPERM_ALIGNED;
	}

	if (fastopen && fastopen->cookie.len >= 0) {
		u32 need = fastopen->cookie.len;

		need += fastopen->cookie.exp ? TCPOLEN_EXP_FASTOPEN_BASE :
					       TCPOLEN_FASTOPEN_BASE;
		need = (need + 3) & ~3U;  /* Align to 32 bits */
		if (remaining >= need) {
			opts->options |= OPTION_FAST_OPEN_COOKIE;
			opts->fastopen_cookie = &fastopen->cookie;
			remaining -= need;
			tp->syn_fastopen = 1;
			tp->syn_fastopen_exp = fastopen->cookie.exp ? 1 : 0;
		}
	}

	smc_set_option(tp, opts, &remaining);

	if (sk_is_mptcp(sk)) {
		unsigned int size;

		if (mptcp_syn_options(sk, skb, &size, &opts->mptcp)) {
			opts->options |= OPTION_MPTCP;
			remaining -= size;
		}
	}

	bpf_skops_hdr_opt_len(sk, skb, NULL, NULL, 0, opts, &remaining);

	return MAX_TCP_OPTION_SPACE - remaining;
}
```

```cpp
/* Compute TCP options for ESTABLISHED sockets. This is not the
 * final wire format yet.
 */
static unsigned int tcp_established_options(struct sock *sk, struct sk_buff *skb,
					struct tcp_out_options *opts,
					struct tcp_md5sig_key **md5)
{
	struct tcp_sock *tp = tcp_sk(sk);
	unsigned int size = 0;
	unsigned int eff_sacks;

	opts->options = 0;

	*md5 = NULL;
#ifdef CONFIG_TCP_MD5SIG
	if (static_branch_unlikely(&tcp_md5_needed) &&
	    rcu_access_pointer(tp->md5sig_info)) {
		*md5 = tp->af_specific->md5_lookup(sk, sk);
		if (*md5) {
			opts->options |= OPTION_MD5;
			size += TCPOLEN_MD5SIG_ALIGNED;
		}
	}
#endif

	if (likely(tp->rx_opt.tstamp_ok)) {
		opts->options |= OPTION_TS;
		opts->tsval = skb ? tcp_skb_timestamp(skb) + tp->tsoffset : 0;
		opts->tsecr = tp->rx_opt.ts_recent;
		size += TCPOLEN_TSTAMP_ALIGNED;
	}

	/* MPTCP options have precedence over SACK for the limited TCP
	 * option space because a MPTCP connection would be forced to
	 * fall back to regular TCP if a required multipath option is
	 * missing. SACK still gets a chance to use whatever space is
	 * left.
	 */
	if (sk_is_mptcp(sk)) {
		unsigned int remaining = MAX_TCP_OPTION_SPACE - size;
		unsigned int opt_size = 0;

		if (mptcp_established_options(sk, skb, &opt_size, remaining,
					      &opts->mptcp)) {
			opts->options |= OPTION_MPTCP;
			size += opt_size;
		}
	}

	eff_sacks = tp->rx_opt.num_sacks + tp->rx_opt.dsack;
	if (unlikely(eff_sacks)) {
		const unsigned int remaining = MAX_TCP_OPTION_SPACE - size;
		if (unlikely(remaining < TCPOLEN_SACK_BASE_ALIGNED +
					 TCPOLEN_SACK_PERBLOCK))
			return size;

		opts->num_sack_blocks =
			min_t(unsigned int, eff_sacks,
			      (remaining - TCPOLEN_SACK_BASE_ALIGNED) /
			      TCPOLEN_SACK_PERBLOCK);

		size += TCPOLEN_SACK_BASE_ALIGNED +
			opts->num_sack_blocks * TCPOLEN_SACK_PERBLOCK;
	}

	if (unlikely(BPF_SOCK_OPS_TEST_FLAG(tp,
					    BPF_SOCK_OPS_WRITE_HDR_OPT_CB_FLAG))) {
		unsigned int remaining = MAX_TCP_OPTION_SPACE - size;

		bpf_skops_hdr_opt_len(sk, skb, NULL, NULL, 0, opts, &remaining);

		size = MAX_TCP_OPTION_SPACE - remaining;
	}

	return size;
}
```

- 写options的函数

```cpp
/* Write previously computed TCP options to the packet.
 *
 * Beware: Something in the Internet is very sensitive to the ordering of
 * TCP options, we learned this through the hard way, so be careful here.
 * Luckily we can at least blame others for their non-compliance but from
 * inter-operability perspective it seems that we're somewhat stuck with
 * the ordering which we have been using if we want to keep working with
 * those broken things (not that it currently hurts anybody as there isn't
 * particular reason why the ordering would need to be changed).
 *
 * At least SACK_PERM as the first option is known to lead to a disaster
 * (but it may well be that other scenarios fail similarly).
 */
static void tcp_options_write(struct tcphdr *th, struct tcp_sock *tp,
			      struct tcp_out_options *opts)
{
	__be32 *ptr = (__be32 *)(th + 1);
	u16 options = opts->options;	/* mungable copy */

	if (unlikely(OPTION_MD5 & options)) {
		*ptr++ = htonl((TCPOPT_NOP << 24) | (TCPOPT_NOP << 16) |
			       (TCPOPT_MD5SIG << 8) | TCPOLEN_MD5SIG);
		/* overload cookie hash location */
		opts->hash_location = (__u8 *)ptr;
		ptr += 4;
	}

	if (unlikely(opts->mss)) {
		*ptr++ = htonl((TCPOPT_MSS << 24) |
			       (TCPOLEN_MSS << 16) |
			       opts->mss);
	}

	if (likely(OPTION_TS & options)) {
		if (unlikely(OPTION_SACK_ADVERTISE & options)) {
			*ptr++ = htonl((TCPOPT_SACK_PERM << 24) |
				       (TCPOLEN_SACK_PERM << 16) |
				       (TCPOPT_TIMESTAMP << 8) |
				       TCPOLEN_TIMESTAMP);
			options &= ~OPTION_SACK_ADVERTISE;
		} else {
			*ptr++ = htonl((TCPOPT_NOP << 24) |
				       (TCPOPT_NOP << 16) |
				       (TCPOPT_TIMESTAMP << 8) |
				       TCPOLEN_TIMESTAMP);
		}
		*ptr++ = htonl(opts->tsval);
		*ptr++ = htonl(opts->tsecr);
	}

	if (unlikely(OPTION_SACK_ADVERTISE & options)) {
		*ptr++ = htonl((TCPOPT_NOP << 24) |
			       (TCPOPT_NOP << 16) |
			       (TCPOPT_SACK_PERM << 8) |
			       TCPOLEN_SACK_PERM);
	}

	if (unlikely(OPTION_WSCALE & options)) {
		*ptr++ = htonl((TCPOPT_NOP << 24) |
			       (TCPOPT_WINDOW << 16) |
			       (TCPOLEN_WINDOW << 8) |
			       opts->ws);
	}

	if (unlikely(opts->num_sack_blocks)) {
		struct tcp_sack_block *sp = tp->rx_opt.dsack ?
			tp->duplicate_sack : tp->selective_acks;
		int this_sack;

		*ptr++ = htonl((TCPOPT_NOP  << 24) |
			       (TCPOPT_NOP  << 16) |
			       (TCPOPT_SACK <<  8) |
			       (TCPOLEN_SACK_BASE + (opts->num_sack_blocks *
						     TCPOLEN_SACK_PERBLOCK)));

		for (this_sack = 0; this_sack < opts->num_sack_blocks;
		     ++this_sack) {
			*ptr++ = htonl(sp[this_sack].start_seq);
			*ptr++ = htonl(sp[this_sack].end_seq);
		}

		tp->rx_opt.dsack = 0;
	}

	if (unlikely(OPTION_FAST_OPEN_COOKIE & options)) {
		struct tcp_fastopen_cookie *foc = opts->fastopen_cookie;
		u8 *p = (u8 *)ptr;
		u32 len; /* Fast Open option length */

		if (foc->exp) {
			len = TCPOLEN_EXP_FASTOPEN_BASE + foc->len;
			*ptr = htonl((TCPOPT_EXP << 24) | (len << 16) |
				     TCPOPT_FASTOPEN_MAGIC);
			p += TCPOLEN_EXP_FASTOPEN_BASE;
		} else {
			len = TCPOLEN_FASTOPEN_BASE + foc->len;
			*p++ = TCPOPT_FASTOPEN;
			*p++ = len;
		}

		memcpy(p, foc->val, foc->len);
		if ((len & 3) == 2) {
			p[foc->len] = TCPOPT_NOP;
			p[foc->len + 1] = TCPOPT_NOP;
		}
		ptr += (len + 3) >> 2;
	}

	smc_options_write(ptr, &options);

	mptcp_options_write(th, ptr, tp, opts);
}
```

- 实现上都是每个option按照4字节对齐，不足补充NOP
