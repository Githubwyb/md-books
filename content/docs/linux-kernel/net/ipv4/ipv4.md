---
weight: 10
---

# 一、总述

## 1. 关键结构体关系

```plantuml
@startuml xxx

class socket {
    struct sock *sk;
}

class sock {}
class inet_sock implements sock {
    struct sock sk;
}
note left of inet_sock
inet_sock是在sock基础上做了一些拓展
创建时申请的是inet_sock但是使用sock结构体指针赋值给socket
在inet里面的操作做强转使用
end note
class inet_connection_sock implements inet_sock {
    struct inet_sock icsk_inet;
}
note left of inet_connection_sock
inet_connection_sock是拓展了inet_sock
同样复用sock的指针
end note

socket <|-- sock

@enduml
```

### 2.1. inet_sock

```cpp
// include/net/inet_sock.h
/** struct inet_sock - representation of INET sockets
 *
 * @sk - ancestor class
 * @pinet6 - pointer to IPv6 control block
 * @inet_daddr - Foreign IPv4 addr
 * @inet_rcv_saddr - Bound local IPv4 addr
 * @inet_dport - Destination port
 * @inet_num - Local port
 * @inet_saddr - Sending source
 * @uc_ttl - Unicast TTL
 * @inet_sport - Source port
 * @inet_id - ID counter for DF pkts
 * @tos - TOS
 * @mc_ttl - Multicasting TTL
 * @is_icsk - is this an inet_connection_sock?
 * @uc_index - Unicast outgoing device index
 * @mc_index - Multicast device index
 * @mc_list - Group array
 * @cork - info to build ip hdr on each ip frag while socket is corked
 */
struct inet_sock {
	/* sk and pinet6 has to be the first two members of inet_sock */
	struct sock		sk;
#if IS_ENABLED(CONFIG_IPV6)
	struct ipv6_pinfo	*pinet6;
#endif
	/* Socket demultiplex comparisons on incoming packets. */
#define inet_daddr		sk.__sk_common.skc_daddr
#define inet_rcv_saddr		sk.__sk_common.skc_rcv_saddr
#define inet_dport		sk.__sk_common.skc_dport
#define inet_num		sk.__sk_common.skc_num

	__be32			inet_saddr;
	__s16			uc_ttl;
	__u16			cmsg_flags;
	struct ip_options_rcu __rcu	*inet_opt;
	__be16			inet_sport;
	__u16			inet_id;

	__u8			tos;
	__u8			min_ttl;
	__u8			mc_ttl;
	__u8			pmtudisc;
	__u8			recverr:1,
				is_icsk:1,
				freebind:1,
				hdrincl:1,
				mc_loop:1,
				transparent:1,
				mc_all:1,
				nodefrag:1;
	__u8			bind_address_no_port:1,
				recverr_rfc4884:1,
				defer_connect:1; /* Indicates that fastopen_connect is set
						  * and cookie exists so we defer connect
						  * until first data frame is written
						  */
	__u8			rcv_tos;
	__u8			convert_csum;
	int			uc_index;
	int			mc_index;
	__be32			mc_addr;
	struct ip_mc_socklist __rcu	*mc_list;
	struct inet_cork_full	cork;
};
```

### 2.2. inet_connection_sock

```cpp
// include/net/inet_connection_sock.h
/** inet_connection_sock - INET connection oriented sock
 *
 * @icsk_accept_queue:	   FIFO of established children
 * @icsk_bind_hash:	   Bind node
 * @icsk_timeout:	   Timeout
 * @icsk_retransmit_timer: Resend (no ack)
 * @icsk_rto:		   Retransmit timeout
 * @icsk_pmtu_cookie	   Last pmtu seen by socket
 * @icsk_ca_ops		   Pluggable congestion control hook
 * @icsk_af_ops		   Operations which are AF_INET{4,6} specific
 * @icsk_ulp_ops	   Pluggable ULP control hook
 * @icsk_ulp_data	   ULP private data
 * @icsk_clean_acked	   Clean acked data hook
 * @icsk_ca_state:	   Congestion control state
 * @icsk_retransmits:	   Number of unrecovered [RTO] timeouts
 * @icsk_pending:	   Scheduled timer event
 * @icsk_backoff:	   Backoff
 * @icsk_syn_retries:      Number of allowed SYN (or equivalent) retries
 * @icsk_probes_out:	   unanswered 0 window probes
 * @icsk_ext_hdr_len:	   Network protocol overhead (IP/IPv6 options)
 * @icsk_ack:		   Delayed ACK control data
 * @icsk_mtup;		   MTU probing control data
 * @icsk_probes_tstamp:    Probe timestamp (cleared by non-zero window ack)
 * @icsk_user_timeout:	   TCP_USER_TIMEOUT value
 */
struct inet_connection_sock {
	/* inet_sock has to be the first member! */
	struct inet_sock	  icsk_inet;
	struct request_sock_queue icsk_accept_queue;
	struct inet_bind_bucket	  *icsk_bind_hash;
	unsigned long		  icsk_timeout;
 	struct timer_list	  icsk_retransmit_timer;
 	struct timer_list	  icsk_delack_timer;
	__u32			  icsk_rto;
	__u32                     icsk_rto_min;
	__u32                     icsk_delack_max;
	__u32			  icsk_pmtu_cookie;
	const struct tcp_congestion_ops *icsk_ca_ops;
	const struct inet_connection_sock_af_ops *icsk_af_ops;
	const struct tcp_ulp_ops  *icsk_ulp_ops;
	void __rcu		  *icsk_ulp_data;
	void (*icsk_clean_acked)(struct sock *sk, u32 acked_seq);
	unsigned int		  (*icsk_sync_mss)(struct sock *sk, u32 pmtu);
	__u8			  icsk_ca_state:5,
				  icsk_ca_initialized:1,
				  icsk_ca_setsockopt:1,
				  icsk_ca_dst_locked:1;
	__u8			  icsk_retransmits;
	__u8			  icsk_pending;
	__u8			  icsk_backoff;
	__u8			  icsk_syn_retries;
	__u8			  icsk_probes_out;
	__u16			  icsk_ext_hdr_len;
	struct {
		__u8		  pending;	 /* ACK is pending			   */
		__u8		  quick;	 /* Scheduled number of quick acks	   */
		__u8		  pingpong;	 /* The session is interactive		   */
		__u8		  retry;	 /* Number of attempts			   */
		__u32		  ato;		 /* Predicted tick of soft clock	   */
		unsigned long	  timeout;	 /* Currently scheduled timeout		   */
		__u32		  lrcvtime;	 /* timestamp of last received data packet */
		__u16		  last_seg_size; /* Size of last incoming segment	   */
		__u16		  rcv_mss;	 /* MSS used for delayed ACK decisions	   */
	} icsk_ack;
	struct {
		/* Range of MTUs to search */
		int		  search_high;
		int		  search_low;

		/* Information on the current probe. */
		u32		  probe_size:31,
		/* Is the MTUP feature enabled for this connection? */
				  enabled:1;

		u32		  probe_timestamp;
	} icsk_mtup;
	u32			  icsk_probes_tstamp;
	u32			  icsk_user_timeout;

	u64			  icsk_ca_priv[104 / sizeof(u64)];
#define ICSK_CA_PRIV_SIZE	  sizeof_field(struct inet_connection_sock, icsk_ca_priv)
};
```

## 2. 初始化流程

```plantuml
@startuml
package inet_init {
    class sock_register
    class inet_add_protocol
    class inet_register_protosw
    class dev_add_pack

    sock_register .. inet_add_protocol
    inet_add_protocol .. inet_register_protosw
    inet_register_protosw .. dev_add_pack
}
class net_families {
    net_proto_family[]
}
note right of net_families
socket创建时选择PF_INET
调用inet_create
end note
class inet_protos {
    net_protocol[]
}
note right of inet_protos
收包时网络层到传输层处理
end note
class inetsw {
    inet_protosw[]
}
note right of inetsw
inet_create中根据具体协议赋值ops
end note
class ptype_all {
    list_head
}
note right of ptype_all
收包时软中断到协议栈处理
也是数据链路层到网络层
end note
sock_register -right-> net_families: (void)sock_register(&inet_family_ops);
inet_add_protocol -right-> inet_protos: inet_add_protocol(&icmp_protocol, IPPROTO_ICMP)
inet_register_protosw -right-> inetsw: inet_register_protosw(q);
dev_add_pack -right-> ptype_all: dev_add_pack(&ip_packet_type);
@enduml
```

```cpp
// net/ipv4/af_inet.c
static int __init inet_init(void)
{
	struct inet_protosw *q;
	struct list_head *r;
	int rc;

	sock_skb_cb_check_size(sizeof(struct inet_skb_parm));

	rc = proto_register(&tcp_prot, 1);
	if (rc)
		goto out;

	rc = proto_register(&udp_prot, 1);
	if (rc)
		goto out_unregister_tcp_proto;

	rc = proto_register(&raw_prot, 1);
	if (rc)
		goto out_unregister_udp_proto;

	rc = proto_register(&ping_prot, 1);
	if (rc)
		goto out_unregister_raw_proto;

	/*
	 *	Tell SOCKET that we are alive...
	 */
	// 向socket注册协议族，这个在socket创建时有用
	(void)sock_register(&inet_family_ops);

#ifdef CONFIG_SYSCTL
	ip_static_sysctl_init();
#endif

	/*
	 *	Add all the base protocols.
	 */
	// 注册传输层协议到网络层，收包使用
	if (inet_add_protocol(&icmp_protocol, IPPROTO_ICMP) < 0)
		pr_crit("%s: Cannot add ICMP protocol\n", __func__);
	if (inet_add_protocol(&udp_protocol, IPPROTO_UDP) < 0)
		pr_crit("%s: Cannot add UDP protocol\n", __func__);
	if (inet_add_protocol(&tcp_protocol, IPPROTO_TCP) < 0)
		pr_crit("%s: Cannot add TCP protocol\n", __func__);
#ifdef CONFIG_IP_MULTICAST
	if (inet_add_protocol(&igmp_protocol, IPPROTO_IGMP) < 0)
		pr_crit("%s: Cannot add IGMP protocol\n", __func__);
#endif

	/* Register the socket-side information for inet_create. */
	for (r = &inetsw[0]; r < &inetsw[SOCK_MAX]; ++r)
		INIT_LIST_HEAD(r);

	// 注册下层协议的相关信息到inetsw中
	for (q = inetsw_array; q < &inetsw_array[INETSW_ARRAY_LEN]; ++q)
		inet_register_protosw(q);

	/*
	 *	Set the ARP module up
	 */

	arp_init();

	/*
	 *	Set the IP module up
	 */

	ip_init();

	/* Initialise per-cpu ipv4 mibs */
	if (init_ipv4_mibs())
		panic("%s: Cannot init ipv4 mibs\n", __func__);

	/* Setup TCP slab cache for open requests. */
	tcp_init();

	/* Setup UDP memory threshold */
	udp_init();

	/* Add UDP-Lite (RFC 3828) */
	udplite4_register();

	raw_init();

	ping_init();

	/*
	 *	Set the ICMP layer up
	 */

	if (icmp_init() < 0)
		panic("Failed to create the ICMP control socket.\n");

	/*
	 *	Initialise the multicast router
	 */
#if defined(CONFIG_IP_MROUTE)
	if (ip_mr_init())
		pr_crit("%s: Cannot init ipv4 mroute\n", __func__);
#endif

	if (init_inet_pernet_ops())
		pr_crit("%s: Cannot init ipv4 inet pernet ops\n", __func__);

	ipv4_proc_init();

	ipfrag_init();

    // 注册收包处理
	dev_add_pack(&ip_packet_type);

	ip_tunnel_core_init();

	rc = 0;
out:
	return rc;
out_unregister_raw_proto:
	proto_unregister(&raw_prot);
out_unregister_udp_proto:
	proto_unregister(&udp_prot);
out_unregister_tcp_proto:
	proto_unregister(&tcp_prot);
	goto out;
}

fs_initcall(inet_init);
```

# 二、ipv4收包后如何处理

## 1. ip层包入口

### 1.1. 最开始注册一个`packet_type`结构体，定义func为`ip_rcv`，被`inet_init`注册

```cpp
// net/ipv4/af_inet.c
static struct packet_type ip_packet_type __read_mostly = {
	.type = cpu_to_be16(ETH_P_IP),
	.func = ip_rcv,
	.list_func = ip_list_rcv,
};

static int __init inet_init(void)
{
	...
    // 注册到dev里面
	dev_add_pack(&ip_packet_type);
	...
}
```

### 1.2. ip_rcv 驱动在受到包之后会调用func

- 可以看到这里是netflt的`PRE_ROUTING`链的挂载点

```cpp
// net/ipv4/ip_input.c
/*
 * IP receive entry point
 */
int ip_rcv(struct sk_buff *skb, struct net_device *dev, struct packet_type *pt,
	   struct net_device *orig_dev)
{
	struct net *net = dev_net(dev);

	skb = ip_rcv_core(skb, net);
	if (skb == NULL)
		return NET_RX_DROP;

	return NF_HOOK(NFPROTO_IPV4, NF_INET_PRE_ROUTING,
		       net, NULL, skb, dev, NULL,
		       ip_rcv_finish);
}
```

#### ip_rcv_core 校验包是否是ipv4的包

- 校验ip头的版本是否为v4
- 校验ip头的checksum是否正确

```cpp
// net/ipv4/ip_input.c
/*
 * 	Main IP Receive routine.
 */
static struct sk_buff *ip_rcv_core(struct sk_buff *skb, struct net *net)
{
	const struct iphdr *iph;
	int drop_reason;
	u32 len;

	/* When the interface is in promisc. mode, drop all the crap
	 * that it receives, do not try to analyse it.
	 */
	if (skb->pkt_type == PACKET_OTHERHOST) {
		dev_core_stats_rx_otherhost_dropped_inc(skb->dev);
		drop_reason = SKB_DROP_REASON_OTHERHOST;
		goto drop;
	}

	__IP_UPD_PO_STATS(net, IPSTATS_MIB_IN, skb->len);

	skb = skb_share_check(skb, GFP_ATOMIC);
	if (!skb) {
		__IP_INC_STATS(net, IPSTATS_MIB_INDISCARDS);
		goto out;
	}

	drop_reason = SKB_DROP_REASON_NOT_SPECIFIED;
	if (!pskb_may_pull(skb, sizeof(struct iphdr)))
		goto inhdr_error;

	iph = ip_hdr(skb);

	/*
	 *	RFC1122: 3.2.1.2 MUST silently discard any IP frame that fails the checksum.
	 *
	 *	Is the datagram acceptable?
	 *
	 *	1.	Length at least the size of an ip header
	 *	2.	Version of 4
	 *	3.	Checksums correctly. [Speed optimisation for later, skip loopback checksums]
	 *	4.	Doesn't have a bogus length
	 */
	// 判断版本是否为ipv4
	if (iph->ihl < 5 || iph->version != 4)
		goto inhdr_error;

	BUILD_BUG_ON(IPSTATS_MIB_ECT1PKTS != IPSTATS_MIB_NOECTPKTS + INET_ECN_ECT_1);
	BUILD_BUG_ON(IPSTATS_MIB_ECT0PKTS != IPSTATS_MIB_NOECTPKTS + INET_ECN_ECT_0);
	BUILD_BUG_ON(IPSTATS_MIB_CEPKTS != IPSTATS_MIB_NOECTPKTS + INET_ECN_CE);
	__IP_ADD_STATS(net,
		       IPSTATS_MIB_NOECTPKTS + (iph->tos & INET_ECN_MASK),
		       max_t(unsigned short, 1, skb_shinfo(skb)->gso_segs));

	if (!pskb_may_pull(skb, iph->ihl*4))
		goto inhdr_error;

	iph = ip_hdr(skb);

	// 校验checksum，校验失败直接丢包
	if (unlikely(ip_fast_csum((u8 *)iph, iph->ihl)))
		goto csum_error;

	len = ntohs(iph->tot_len);
	if (skb->len < len) {
		drop_reason = SKB_DROP_REASON_PKT_TOO_SMALL;
		__IP_INC_STATS(net, IPSTATS_MIB_INTRUNCATEDPKTS);
		goto drop;
	} else if (len < (iph->ihl*4))
		goto inhdr_error;

	/* Our transport medium may have padded the buffer out. Now we know it
	 * is IP we can trim to the true length of the frame.
	 * Note this now means skb->len holds ntohs(iph->tot_len).
	 */
	if (pskb_trim_rcsum(skb, len)) {
		__IP_INC_STATS(net, IPSTATS_MIB_INDISCARDS);
		goto drop;
	}

	iph = ip_hdr(skb);
	skb->transport_header = skb->network_header + iph->ihl*4;

	/* Remove any debris in the socket control block */
	memset(IPCB(skb), 0, sizeof(struct inet_skb_parm));
	IPCB(skb)->iif = skb->skb_iif;

	/* Must drop socket now because of tproxy. */
	if (!skb_sk_is_prefetched(skb))
		skb_orphan(skb);

	return skb;

csum_error:
	drop_reason = SKB_DROP_REASON_IP_CSUM;
	__IP_INC_STATS(net, IPSTATS_MIB_CSUMERRORS);
inhdr_error:
	if (drop_reason == SKB_DROP_REASON_NOT_SPECIFIED)
		drop_reason = SKB_DROP_REASON_IP_INHDR;
	__IP_INC_STATS(net, IPSTATS_MIB_INHDRERRORS);
drop:
	kfree_skb_reason(skb, drop_reason);
out:
	return NULL;
}
```

### 1.3. `ip_rcv_finish`这里处理了路由，如果路由不过就进行drop

```cpp
// net/ipv4/ip_input.c
static int ip_rcv_finish(struct net *net, struct sock *sk, struct sk_buff *skb)
{
	struct net_device *dev = skb->dev;
	int ret;

	/* if ingress device is enslaved to an L3 master device pass the
	 * skb to its handler for processing
	 */
	skb = l3mdev_ip_rcv(skb);
	if (!skb)
		return NET_RX_SUCCESS;

    // 这个函数处理了路由
	ret = ip_rcv_finish_core(net, sk, skb, dev, NULL);
	if (ret != NET_RX_DROP)
		ret = dst_input(skb);
	return ret;
}
```

- `dst_input`里面是调用`skb_dst(skb)->input`，不过一般是`ip_local_deliver`

```cpp
// include/net/dst.h
INDIRECT_CALLABLE_DECLARE(int ip6_input(struct sk_buff *));
INDIRECT_CALLABLE_DECLARE(int ip_local_deliver(struct sk_buff *));
/* Input packet from network to transport.  */
static inline int dst_input(struct sk_buff *skb)
{
	return INDIRECT_CALL_INET(skb_dst(skb)->input,
				  ip6_input, ip_local_deliver, skb);
}
```

- 这里也是netfilter的`LOCAL_IN`挂载点，可以在这里进行过滤

```cpp
// net/ipv4/ip_input.c
/*
 * 	Deliver IP Packets to the higher protocol layers.
 */
int ip_local_deliver(struct sk_buff *skb) {
    /*
     *	Reassemble IP fragments.
     */
    struct net *net = dev_net(skb->dev);

    // 判断是否为分片包，分片包就先处理分片
    if (ip_is_fragment(ip_hdr(skb))) {
        if (ip_defrag(net, skb, IP_DEFRAG_LOCAL_DELIVER))
            return 0;
    }

    // 分片处理完毕调用ip_local_deliver_finish()
    // NF_HOOK挂载netflt
    return NF_HOOK(NFPROTO_IPV4, NF_INET_LOCAL_IN,
               net, NULL, skb, skb->dev, NULL,
               ip_local_deliver_finish);
}
```

- 根据ip包内的协议处理具体的协议

```cpp
// net/ipv4/ip_input.c
// ip_local_deliver_finish() -call-> ip_local_deliver_finish()
void ip_local_deliver_finish(struct net *net, struct sk_buff *skb, int protocol) {
    const struct net_protocol *ipprot;
    int raw, ret;

resubmit:
    raw = raw_local_deliver(skb, protocol);

    // 这里找到具体的协议的处理函数，然后调用具体的协议处理函数
    ipprot = rcu_dereference(inet_protos[protocol]);
    if (ipprot) {
        if (!ipprot->no_policy) {
            if (!xfrm4_policy_check(NULL, XFRM_POLICY_IN, skb)) {
                kfree_skb(skb);
                return;
            }
            nf_reset_ct(skb);
        }
        // 相当于调用ipprot->handler(skb)
        ret = INDIRECT_CALL_2(ipprot->handler, tcp_v4_rcv, udp_rcv,
                      skb);
        if (ret < 0) {
            protocol = -ret;
            goto resubmit;
        }
        __IP_INC_STATS(net, IPSTATS_MIB_INDELIVERS);
    } else {
        if (!raw) {
            if (xfrm4_policy_check(NULL, XFRM_POLICY_IN, skb)) {
                __IP_INC_STATS(net, IPSTATS_MIB_INUNKNOWNPROTOS);
                // 这里是服务端会回复一个icmp包，内容就是端口不可达
                icmp_send(skb, ICMP_DEST_UNREACH,
                      ICMP_PROT_UNREACH, 0);
            }
            kfree_skb(skb);
        } else {
            __IP_INC_STATS(net, IPSTATS_MIB_INDELIVERS);
            consume_skb(skb);
        }
    }
}
```

- `inet_protos[protocol]`是一个指向net_protocol结构的指针，net_protocol结构中包含了协议的处理函数
- 使用下面两个函数进行注册特定的协议

```cpp
// net/ipv4/protocol.c
int inet_add_protocol(const struct net_protocol *prot, unsigned char protocol);
EXPORT_SYMBOL(inet_add_protocol);

int inet_del_protocol(const struct net_protocol *prot, unsigned char protocol);
EXPORT_SYMBOL(inet_del_protocol);
```

## 2. 路由处理

- 上面讲了通过`ip_rcv_finish_core`来处理路由

```cpp
// net/ipv4/ip_input.c
static int ip_rcv_finish_core(struct net *net, struct sock *sk,
			      struct sk_buff *skb, struct net_device *dev,
			      const struct sk_buff *hint)
{
	const struct iphdr *iph = ip_hdr(skb);
	int err, drop_reason;
	struct rtable *rt;

	drop_reason = SKB_DROP_REASON_NOT_SPECIFIED;

	if (ip_can_use_hint(skb, iph, hint)) {
		err = ip_route_use_hint(skb, iph->daddr, iph->saddr, iph->tos,
					dev, hint);
		if (unlikely(err))
			goto drop_error;
	}

	if (READ_ONCE(net->ipv4.sysctl_ip_early_demux) &&
	    !skb_dst(skb) &&
	    !skb->sk &&
	    !ip_is_fragment(iph)) {
		switch (iph->protocol) {
		case IPPROTO_TCP:
			if (READ_ONCE(net->ipv4.sysctl_tcp_early_demux)) {
				tcp_v4_early_demux(skb);

				/* must reload iph, skb->head might have changed */
				iph = ip_hdr(skb);
			}
			break;
		case IPPROTO_UDP:
			if (READ_ONCE(net->ipv4.sysctl_udp_early_demux)) {
				err = udp_v4_early_demux(skb);
				if (unlikely(err))
					goto drop_error;

				/* must reload iph, skb->head might have changed */
				iph = ip_hdr(skb);
			}
			break;
		}
	}

	/*
	 *	Initialise the virtual path cache for the packet. It describes
	 *	how the packet travels inside Linux networking.
	 */
	if (!skb_valid_dst(skb)) {
        // 处理路由
		err = ip_route_input_noref(skb, iph->daddr, iph->saddr,
					   iph->tos, dev);
		if (unlikely(err))
			goto drop_error;
	}
    ...

drop:
	kfree_skb_reason(skb, drop_reason);
	return NET_RX_DROP;

drop_error:
	if (err == -EXDEV) {
		drop_reason = SKB_DROP_REASON_IP_RPFILTER;
		__NET_INC_STATS(net, LINUX_MIB_IPRPFILTER);
	}
	goto drop;
}
```

- `ip_route_input_noref`处理路由

```cpp
// net/ipv4/route.c
int ip_route_input_noref(struct sk_buff *skb, __be32 daddr, __be32 saddr,
			 u8 tos, struct net_device *dev)
{
	struct fib_result res;
	int err;

	tos &= IPTOS_RT_MASK;
	rcu_read_lock();
	err = ip_route_input_rcu(skb, daddr, saddr, tos, dev, &res);
	rcu_read_unlock();

	return err;
}
EXPORT_SYMBOL(ip_route_input_noref);

// net/ipv4/route.c
/* called with rcu_read_lock held */
int ip_route_input_rcu(struct sk_buff *skb, __be32 daddr, __be32 saddr,
		       u8 tos, struct net_device *dev, struct fib_result *res)
{
	/* Multicast recognition logic is moved from route cache to here.
	 * The problem was that too many Ethernet cards have broken/missing
	 * hardware multicast filters :-( As result the host on multicasting
	 * network acquires a lot of useless route cache entries, sort of
	 * SDR messages from all the world. Now we try to get rid of them.
	 * Really, provided software IP multicast filter is organized
	 * reasonably (at least, hashed), it does not result in a slowdown
	 * comparing with route cache reject entries.
	 * Note, that multicast routers are not affected, because
	 * route cache entry is created eventually.
	 */
    // 多播地址处理
	if (ipv4_is_multicast(daddr)) {
        ...
        return err;
	}

    // 单播处理
	return ip_route_input_slow(skb, daddr, saddr, tos, dev, res);
}
```

### 2.1. `rp_filter`如何生效

- `ip_route_input_slow`处理单播包

```cpp
// net/ipv4/route.c
/*
 *	NOTE. We drop all the packets that has local source
 *	addresses, because every properly looped back packet
 *	must have correct destination already attached by output routine.
 *	Changes in the enforced policies must be applied also to
 *	ip_route_use_hint().
 *
 *	Such approach solves two big problems:
 *	1. Not simplex devices are handled properly.
 *	2. IP spoofing attempts are filtered with 100% of guarantee.
 *	called with rcu_read_lock()
 */

static int ip_route_input_slow(struct sk_buff *skb, __be32 daddr, __be32 saddr,
			       u8 tos, struct net_device *dev,
			       struct fib_result *res)
{
	...
	// 这里处理一下res，获取type
	err = fib_lookup(net, &fl4, res, 0);
	if (err != 0) {
		if (!IN_DEV_FORWARD(in_dev))
			err = -EHOSTUNREACH;
		goto no_route;
	}

	if (res->type == RTN_BROADCAST) {
		// 广播包
		if (IN_DEV_BFORWARD(in_dev))
			goto make_route;
		/* not do cache if bc_forwarding is enabled */
		if (IPV4_DEVCONF_ALL(net, BC_FORWARDING))
			do_cache = false;
		goto brd_input;
	}

	if (res->type == RTN_LOCAL) {
		// 发给本地的走这个逻辑，下面校验源地址是否正确
		err = fib_validate_source(skb, saddr, daddr, tos,
					  0, dev, in_dev, &itag);
		if (err < 0)
			goto martian_source;
		goto local_input;
	}
	...
out:	return err;
	...
local_input:
	no_policy = IN_DEV_ORCONF(in_dev, NOPOLICY);
	if (no_policy)
		IPCB(skb)->flags |= IPSKB_NOPOLICY;

	do_cache &= res->fi && !itag;
	if (do_cache) {
		struct fib_nh_common *nhc = FIB_RES_NHC(*res);

		rth = rcu_dereference(nhc->nhc_rth_input);
		if (rt_cache_valid(rth)) {
			skb_dst_set_noref(skb, &rth->dst);
			err = 0;
			// 有cache正常走到这里
			goto out;
		}
	}
	// 没有就创建cache，最终都会到out返回
	...
	goto out;
```

- `fib_validate_source`校验源地址是否正确
- 这里会判断进入的设备的`rp_filter`选项，如果为1，根据对应的源地址目的地址反向查找路由，对应的网卡如果不匹配就进行丢包

```cpp
// net/ipv4/fib_frontend.c
/* Ignore rp_filter for packets protected by IPsec. */
int fib_validate_source(struct sk_buff *skb, __be32 src, __be32 dst,
			u8 tos, int oif, struct net_device *dev,
			struct in_device *idev, u32 *itag)
{
    // r就是对应网卡的rp_filter选项，使用sysctl -a | grep -i \.rp_filter可以看到
    // net.ipv4.conf.wlp0s20f0u1u2.rp_filter = 2
	int r = secpath_exists(skb) ? 0 : IN_DEV_RPFILTER(idev);
	struct net *net = dev_net(dev);

	if (!r && !fib_num_tclassid_users(net) &&
	    (dev->ifindex != oif || !IN_DEV_TX_REDIRECTS(idev))) {
		if (IN_DEV_ACCEPT_LOCAL(idev))
			goto ok;
		/* with custom local routes in place, checking local addresses
		 * only will be too optimistic, with custom rules, checking
		 * local addresses only can be too strict, e.g. due to vrf
		 */
		if (net->ipv4.fib_has_custom_local_routes ||
		    fib4_has_custom_rules(net))
			goto full_check;
		/* Within the same container, it is regarded as a martian source,
		 * and the same host but different containers are not.
		 */
		if (inet_lookup_ifaddr_rcu(net, src))
			return -EINVAL;

ok:
		*itag = 0;
		return 0;
	}

full_check:
	return __fib_validate_source(skb, src, dst, tos, oif, dev, r, idev, itag);
}
```

- 下面的函数`__fib_validate_source`做判断

```cpp
// net/ipv4/fib_frontend.c
/* 到这一步的堆栈
__fib_validate_source(struct sk_buff * skb, __be32 src, __be32 dst, u8 tos, int oif, struct net_device * dev, int rpf, struct in_device * idev, u32 * itag) (/net/ipv4/fib_frontend.c:385)
fib_validate_source(struct sk_buff * skb, __be32 src, __be32 dst, u8 tos, int oif, struct net_device * dev, struct in_device * idev, u32 * itag) (/net/ipv4/fib_frontend.c:454)
ip_route_input_slow(struct sk_buff * skb, __be32 daddr, __be32 saddr, u8 tos, struct net_device * dev, struct fib_result * res) (/net/ipv4/route.c:2336)
ip_route_input_rcu(struct sk_buff * skb, __be32 daddr, __be32 saddr, u8 tos, struct net_device * dev, struct fib_result * res) (/net/ipv4/route.c:2519)
ip_route_input_noref(struct sk_buff * skb, __be32 daddr, __be32 saddr, u8 tos, struct net_device * dev) (/net/ipv4/route.c:2462)
ip_rcv_finish_core(struct net * net, struct sock * sk, struct sk_buff * skb, struct net_device * dev, const struct sk_buff * hint) (/net/ipv4/ip_input.c:369)
ip_rcv_finish(struct net * net, struct sock * sk, struct sk_buff * skb) (/net/ipv4/ip_input.c:447)
 */
/* Given (packet source, input interface) and optional (dst, oif, tos):
 * - (main) check, that source is valid i.e. not broadcast or our local
 *   address.
 * - figure out what "logical" interface this packet arrived
 *   and calculate "specific destination" address.
 * - check, that packet arrived from expected physical interface.
 * called with rcu_read_lock()
 */
static int __fib_validate_source(struct sk_buff *skb, __be32 src, __be32 dst,
				 u8 tos, int oif, struct net_device *dev,
				 int rpf, struct in_device *idev, u32 *itag)
{
	struct net *net = dev_net(dev);
	...
	dev_match = fib_info_nh_uses_dev(res.fi, dev);
	/* This is not common, loopback packets retain skb_dst so normally they
	 * would not even hit this slow path.
	 */
    // 看网卡是否对应上，如果对应不上走后面流程
	dev_match = dev_match || (res.type == RTN_LOCAL &&
				  dev == net->loopback_dev);
	if (dev_match) {
		ret = FIB_RES_NHC(res)->nhc_scope >= RT_SCOPE_HOST;
		return ret;
	}
	if (no_addr)
		goto last_resort;
    // 这里判断如果rp_filter == 1就会丢包，否则正常返回
	if (rpf == 1)
		goto e_rpf;
	fl4.flowi4_oif = dev->ifindex;

	ret = 0;
	if (fib_lookup(net, &fl4, &res, FIB_LOOKUP_IGNORE_LINKSTATE) == 0) {
		if (res.type == RTN_UNICAST)
			ret = FIB_RES_NHC(res)->nhc_scope >= RT_SCOPE_HOST;
	}
	return ret;

last_resort:
	if (rpf)
		goto e_rpf;
	*itag = 0;
	return 0;
	...
e_rpf:
	return -EXDEV;
}
```

### 2.2. 路由如何走转发

- `ip_route_input_slow`处理单播包

```cpp
// net/ipv4/route.c
static int ip_route_input_slow(struct sk_buff *skb, __be32 daddr, __be32 saddr,
			       u8 tos, struct net_device *dev,
			       struct fib_result *res)
{
	...
	// 这里处理一下res，获取type
	err = fib_lookup(net, &fl4, res, 0);
	if (err != 0) {
		if (!IN_DEV_FORWARD(in_dev))
			err = -EHOSTUNREACH;
		goto no_route;
	}

	// 非广播包
	if (res->type == RTN_BROADCAST) {
		...
		goto brd_input;
	}

	// 非发给本地的包
	if (res->type == RTN_LOCAL) {
		...
		goto local_input;
	}

	// 不是发给本地的也不是广播，判断一下进入的设备有没有开启forwarding
	// 配置为 /proc/sys/net/ipv4/conf/<interface>/forwarding
	// 可以用 sysctl -w net.ipv4.conf.<interface>.forwarding=1 进行配置
	if (!IN_DEV_FORWARD(in_dev)) {
		err = -EHOSTUNREACH;
		goto no_route;
	}

	// 非组播包
	if (res->type != RTN_UNICAST)
		goto martian_destination;

make_route:
    // 转发包走到这里
	err = ip_mkroute_input(skb, res, in_dev, daddr, saddr, tos, flkeys);
out:	return err;
    ...
}

// net/ipv4/route.c
static int ip_mkroute_input(struct sk_buff *skb,
			    struct fib_result *res,
			    struct in_device *in_dev,
			    __be32 daddr, __be32 saddr, u32 tos,
			    struct flow_keys *hkeys)
{
#ifdef CONFIG_IP_ROUTE_MULTIPATH
	if (res->fi && fib_info_num_path(res->fi) > 1) {
		int h = fib_multipath_hash(res->fi->fib_net, NULL, skb, hkeys);

		fib_select_multipath(res, h);
	}
#endif

	/* create a routing cache entry */
	return __mkroute_input(skb, res, in_dev, daddr, saddr, tos);
}
```

- 下面是处理转发的，将`rth->dst.input`设置为`ip_forward`

```cpp
// net/ipv4/route.c
/* 到这里的堆栈
__mkroute_input(struct sk_buff * skb, const struct fib_result * res, struct in_device * in_dev, __be32 daddr, __be32 saddr, u32 tos) (/net/ipv4/route.c:1881)
ip_mkroute_input(struct sk_buff * skb, struct fib_result * res, struct in_device * in_dev, __be32 daddr, __be32 saddr, u32 tos, struct flow_keys * hkeys) (/net/ipv4/route.c:2168)
ip_route_input_slow(struct sk_buff * skb, __be32 daddr, __be32 saddr, u8 tos, struct net_device * dev, struct fib_result * res) (/net/ipv4/route.c:2351)
ip_route_input_rcu(struct sk_buff * skb, __be32 daddr, __be32 saddr, u8 tos, struct net_device * dev, struct fib_result * res) (/net/ipv4/route.c:2519)
ip_route_input_noref(struct sk_buff * skb, __be32 daddr, __be32 saddr, u8 tos, struct net_device * dev) (/net/ipv4/route.c:2462)
ip_rcv_finish_core(struct net * net, struct sock * sk, struct sk_buff * skb, struct net_device * dev, const struct sk_buff * hint) (/net/ipv4/ip_input.c:369)
 */
/* called in rcu_read_lock() section */
static int __mkroute_input(struct sk_buff *skb,
			   const struct fib_result *res,
			   struct in_device *in_dev,
			   __be32 daddr, __be32 saddr, u32 tos)
{
	...
	// 这里会校验rp_filter，同样需要入包的设备配置
	err = fib_validate_source(skb, saddr, daddr, tos, FIB_RES_OIF(*res),
				  in_dev->dev, in_dev, &itag);
	if (err < 0) {
		ip_handle_martian_source(in_dev->dev, in_dev, skb, daddr,
					 saddr);

		goto cleanup;
	}
	...
	rth->rt_is_input = 1;
	RT_CACHE_STAT_INC(in_slow_tot);

	rth->dst.input = ip_forward;

	rt_set_nexthop(rth, daddr, res, fnhe, res->fi, res->type, itag,
		       do_cache);
	lwtunnel_set_redirect(&rth->dst);
	skb_dst_set(skb, &rth->dst);
out:
	err = 0;
 cleanup:
	return err;
}
```

## 3. 转发数据包处理

- 从上面得知，当数据包要走转发，`rth->dst.input`设置为`ip_forward`
- 下面的调用就会调用到`skb_dst(skb)->input`也就是`ip_forward`

```cpp
// include/net/dst.h
INDIRECT_CALLABLE_DECLARE(int ip6_input(struct sk_buff *));
INDIRECT_CALLABLE_DECLARE(int ip_local_deliver(struct sk_buff *));
/* Input packet from network to transport.  */
static inline int dst_input(struct sk_buff *skb)
{
	return INDIRECT_CALL_INET(skb_dst(skb)->input,
				  ip6_input, ip_local_deliver, skb);
}
```

- `ip_forward`处理，会走到forward链

```cpp
// net/ipv4/ip_forward.c
int ip_forward(struct sk_buff *skb)
{
	...
	/*
	 *	According to the RFC, we must first decrease the TTL field. If
	 *	that reaches zero, we must reply an ICMP control message telling
	 *	that the packet's lifetime expired.
	 */
	// 转发前判断一下ttl，ttl不够就不转发了，到后面返回icmp不可达
	if (ip_hdr(skb)->ttl <= 1)
		goto too_many_hops;

	if (!xfrm4_route_forward(skb)) {
		SKB_DR_SET(reason, XFRM_POLICY);
		goto drop;
	}

	rt = skb_rtable(skb);

	if (opt->is_strictroute && rt->rt_uses_gateway)
		goto sr_failed;

	IPCB(skb)->flags |= IPSKB_FORWARDED;
	mtu = ip_dst_mtu_maybe_forward(&rt->dst, true);
	if (ip_exceeds_mtu(skb, mtu)) {
		IP_INC_STATS(net, IPSTATS_MIB_FRAGFAILS);
		icmp_send(skb, ICMP_DEST_UNREACH, ICMP_FRAG_NEEDED,
			  htonl(mtu));
		SKB_DR_SET(reason, PKT_TOO_BIG);
		goto drop;
	}

	/* We are about to mangle packet. Copy it! */
	if (skb_cow(skb, LL_RESERVED_SPACE(rt->dst.dev)+rt->dst.header_len))
		goto drop;
	iph = ip_hdr(skb);

	/* Decrease ttl after skb cow done */
	// 减ttl
	ip_decrease_ttl(iph);

	/*
	 *	We now generate an ICMP HOST REDIRECT giving the route
	 *	we calculated.
	 */
	if (IPCB(skb)->flags & IPSKB_DOREDIRECT && !opt->srr &&
	    !skb_sec_path(skb))
		ip_rt_send_redirect(skb);

	if (READ_ONCE(net->ipv4.sysctl_ip_fwd_update_priority))
		skb->priority = rt_tos2priority(iph->tos);

	// 这里处理netfilter的forward链，然后调用ip_forward_finish
	return NF_HOOK(NFPROTO_IPV4, NF_INET_FORWARD,
		       net, NULL, skb, skb->dev, rt->dst.dev,
		       ip_forward_finish);

sr_failed:
	/*
	 *	Strict routing permits no gatewaying
	 */
	 icmp_send(skb, ICMP_DEST_UNREACH, ICMP_SR_FAILED, 0);
	 goto drop;

too_many_hops:
	/* Tell the sender its packet died... */
	__IP_INC_STATS(net, IPSTATS_MIB_INHDRERRORS);
	// 这里回icmp，到达ttl上限
	icmp_send(skb, ICMP_TIME_EXCEEDED, ICMP_EXC_TTL, 0);
	SKB_DR_SET(reason, IP_INHDR);
drop:
	kfree_skb_reason(skb, reason);
	return NET_RX_DROP;
}
```

- 走完`FORWARD`链调用`ip_forward_finish`，就调用到`dst_output`走发包流程
- `dst_output`后面就是`POSTROUTING`，过了转发链就不会走`OUTPUT`和路由了

```cpp
// net/ipv4/ip_forward.c
/* 到这一步的堆栈，从rcv到forward，中间有一个ip_forward和netfilter的FORWARD链没展示出来
ip_forward_finish(struct net * net, struct sock * sk, struct sk_buff * skb) (/net/ipv4/ip_forward.c:69)
dst_input(struct sk_buff * skb) (/include/net/dst.h:462)
ip_rcv_finish(struct net * net, struct sock * sk, struct sk_buff * skb) (/net/ipv4/ip_input.c:449)
 */
static int ip_forward_finish(struct net *net, struct sock *sk, struct sk_buff *skb)
{
	...
	skb_clear_tstamp(skb);
	return dst_output(net, sk, skb);
}
```

# 三、socket相关操作

## 1. inet_create socket创建

### 1.1. 注册协议族到socket那边，create调用`inet_create`

```cpp
// net/ipv4/af_inet.c
static const struct net_proto_family inet_family_ops = {
	.family = PF_INET,
	.create = inet_create,
	.owner	= THIS_MODULE,
};

static int __init inet_init(void) {
    ...
    (void)sock_register(&inet_family_ops);
    ...
}
```

### 1.2. 注册对应的下层协议到inet_sw中

```cpp
// net/ipv4/af_inet.c
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

    {
        .type =       SOCK_DGRAM,
        .protocol =   IPPROTO_UDP,
        .prot =       &udp_prot,
        .ops =        &inet_dgram_ops,
        .flags =      INET_PROTOSW_PERMANENT,
    },

    {
        .type =       SOCK_DGRAM,
        .protocol =   IPPROTO_ICMP,
        .prot =       &ping_prot,
        .ops =        &inet_sockraw_ops,
        .flags =      INET_PROTOSW_REUSE,
    },

    {
        .type =       SOCK_RAW,
        .protocol =   IPPROTO_IP,	/* wild card */
        .prot =       &raw_prot,
        .ops =        &inet_sockraw_ops,
        .flags =      INET_PROTOSW_REUSE,
    }
};
...
static int __init inet_init(void)
{
...
    for (q = inetsw_array; q < &inetsw_array[INETSW_ARRAY_LEN]; ++q)
        inet_register_protosw(q);
...
}
```

### 1.3. 调用inet_create创建socket

- 会继续根据协议找特定协议需要注册的结构，然后调用底层的init

```cpp
// net/ipv4/af_inet.c
/*
 *	Create an inet socket.
 */

static int inet_create(struct net *net, struct socket *sock, int protocol,
               int kern)
{
    struct sock *sk;
    struct inet_protosw *answer;
    struct inet_sock *inet;
    struct proto *answer_prot;
    unsigned char answer_flags;
    int try_loading_module = 0;
    int err;

    if (protocol < 0 || protocol >= IPPROTO_MAX)
        return -EINVAL;

    // 初始化状态为SS_UNCONNETED
    sock->state = SS_UNCONNECTED;

    /* Look for the requested type/protocol pair. */
lookup_protocol:
    err = -ESOCKTNOSUPPORT;
    rcu_read_lock();
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

    if (unlikely(err)) {
        if (try_loading_module < 2) {
            rcu_read_unlock();
            /*
             * Be more specific, e.g. net-pf-2-proto-132-type-1
             * (net-pf-PF_INET-proto-IPPROTO_SCTP-type-SOCK_STREAM)
             */
            if (++try_loading_module == 1)
                request_module("net-pf-%d-proto-%d-type-%d",
                           PF_INET, protocol, sock->type);
            /*
             * Fall back to generic, e.g. net-pf-2-proto-132
             * (net-pf-PF_INET-proto-IPPROTO_SCTP)
             */
            else
                request_module("net-pf-%d-proto-%d",
                           PF_INET, protocol);
            goto lookup_protocol;
        } else
            goto out_rcu_unlock;
    }

    err = -EPERM;
    if (sock->type == SOCK_RAW && !kern &&
        !ns_capable(net->user_ns, CAP_NET_RAW))
        goto out_rcu_unlock;

    // 将对应协议的操作放到sock里面
    sock->ops = answer->ops;
    answer_prot = answer->prot;
    answer_flags = answer->flags;
    rcu_read_unlock();

    WARN_ON(!answer_prot->slab);

    err = -ENOMEM;
    sk = sk_alloc(net, PF_INET, GFP_KERNEL, answer_prot, kern);
    if (!sk)
        goto out;

    err = 0;
    if (INET_PROTOSW_REUSE & answer_flags)
        sk->sk_reuse = SK_CAN_REUSE;

    inet = inet_sk(sk);
    inet->is_icsk = (INET_PROTOSW_ICSK & answer_flags) != 0;

    inet->nodefrag = 0;

    if (SOCK_RAW == sock->type) {
        inet->inet_num = protocol;
        if (IPPROTO_RAW == protocol)
            inet->hdrincl = 1;
    }

    if (READ_ONCE(net->ipv4.sysctl_ip_no_pmtu_disc))
        inet->pmtudisc = IP_PMTUDISC_DONT;
    else
        inet->pmtudisc = IP_PMTUDISC_WANT;

    inet->inet_id = 0;

    sock_init_data(sock, sk);

    sk->sk_destruct	   = inet_sock_destruct;
    sk->sk_protocol	   = protocol;
    sk->sk_backlog_rcv = sk->sk_prot->backlog_rcv;

    inet->uc_ttl	= -1;
    inet->mc_loop	= 1;
    inet->mc_ttl	= 1;
    inet->mc_all	= 1;
    inet->mc_index	= 0;
    inet->mc_list	= NULL;
    inet->rcv_tos	= 0;

    sk_refcnt_debug_inc(sk);

    if (inet->inet_num) {
        /* It assumes that any protocol which allows
         * the user to assign a number at socket
         * creation time automatically
         * shares.
         */
        inet->inet_sport = htons(inet->inet_num);
        /* Add to protocol hash chains. */
        err = sk->sk_prot->hash(sk);
        if (err) {
            sk_common_release(sk);
            goto out;
        }
    }

    if (sk->sk_prot->init) {
		// 这里调用tcp特定的init
        err = sk->sk_prot->init(sk);
        if (err) {
            sk_common_release(sk);
            goto out;
        }
    }

    if (!kern) {
        err = BPF_CGROUP_RUN_PROG_INET_SOCK(sk);
        if (err) {
            sk_common_release(sk);
            goto out;
        }
    }
out:
    return err;
out_rcu_unlock:
    rcu_read_unlock();
    goto out;
}
```

- tcp相关结构注册查看 [tcp初始化socket](/docs/linux-kernel/net/ipv4/tcp/#2-%E6%B3%A8%E5%86%8C%E5%88%B0socket%E9%87%8C%E9%9D%A2%E7%9A%84%E7%89%B9%E5%AE%9A%E7%BB%93%E6%9E%84)

## 2. bind 绑定地址

- tcp和udp的bind接口都指向`inet_bind`

```cpp
// net/ipv4/af_inet.c
const struct proto_ops inet_stream_ops = {
	...
	.bind		   = inet_bind,
	...
};

// net/ipv4/af_inet.c
const struct proto_ops inet_dgram_ops = {
	...
	.bind		   = inet_bind,
	...
};

// net/ipv4/af_inet.c
/*
 * For SOCK_RAW sockets; should be the same as inet_dgram_ops but without
 * udp_poll
 */
const struct proto_ops inet_sockraw_ops = {
	...
	.bind		   = inet_bind,
	...
};
```

### 2.1. inet_bind

- 主要逻辑是参数检查和赋值，将端口和地址赋值到`inet_sock`的recv的地址上
- 端口检查要到具体的传输层协议查看

```cpp
// net/ipv4/af_inet.c
int inet_bind(struct socket *sock, struct sockaddr *uaddr, int addr_len)
{
	struct sock *sk = sock->sk;
	u32 flags = BIND_WITH_LOCK;
	int err;

	/* If the socket has its own bind function then use it. (RAW) */
	if (sk->sk_prot->bind) {
		return sk->sk_prot->bind(sk, uaddr, addr_len);
	}
	if (addr_len < sizeof(struct sockaddr_in))
		return -EINVAL;

	/* BPF prog is run before any checks are done so that if the prog
	 * changes context in a wrong way it will be caught.
	 */
	err = BPF_CGROUP_RUN_PROG_INET_BIND_LOCK(sk, uaddr,
						 CGROUP_INET4_BIND, &flags);
	if (err)
		return err;

	return __inet_bind(sk, uaddr, addr_len, flags);
}
EXPORT_SYMBOL(inet_bind);

// net/ipv4/af_inet.c
int __inet_bind(struct sock *sk, struct sockaddr *uaddr, int addr_len,
		u32 flags)
{
	struct sockaddr_in *addr = (struct sockaddr_in *)uaddr;
	struct inet_sock *inet = inet_sk(sk);
	struct net *net = sock_net(sk);
	unsigned short snum;
	int chk_addr_ret;
	u32 tb_id = RT_TABLE_LOCAL;
	int err;

	if (addr->sin_family != AF_INET) {
		/* Compatibility games : accept AF_UNSPEC (mapped to AF_INET)
		 * only if s_addr is INADDR_ANY.
		 */
		err = -EAFNOSUPPORT;
		if (addr->sin_family != AF_UNSPEC ||
		    addr->sin_addr.s_addr != htonl(INADDR_ANY))
			goto out;
	}

	tb_id = l3mdev_fib_table_by_index(net, sk->sk_bound_dev_if) ? : tb_id;
	chk_addr_ret = inet_addr_type_table(net, addr->sin_addr.s_addr, tb_id);

	/* Not specified by any standard per-se, however it breaks too
	 * many applications when removed.  It is unfortunate since
	 * allowing applications to make a non-local bind solves
	 * several problems with systems using dynamic addressing.
	 * (ie. your servers still start up even if your ISDN link
	 *  is temporarily down)
	 */
	err = -EADDRNOTAVAIL;
	if (!inet_addr_valid_or_nonlocal(net, inet, addr->sin_addr.s_addr,
	                                 chk_addr_ret))
		goto out;

	snum = ntohs(addr->sin_port);
	err = -EACCES;
	if (!(flags & BIND_NO_CAP_NET_BIND_SERVICE) &&
	    snum && inet_port_requires_bind_service(net, snum) &&
	    !ns_capable(net->user_ns, CAP_NET_BIND_SERVICE))
		goto out;

	/*      We keep a pair of addresses. rcv_saddr is the one
	 *      used by hash lookups, and saddr is used for transmit.
	 *
	 *      In the BSD API these are the same except where it
	 *      would be illegal to use them (multicast/broadcast) in
	 *      which case the sending device address is used.
	 */
	if (flags & BIND_WITH_LOCK)
		lock_sock(sk);

	/* Check these errors (active socket, double bind). */
	err = -EINVAL;
	if (sk->sk_state != TCP_CLOSE || inet->inet_num)
		goto out_release_sock;

	inet->inet_rcv_saddr = inet->inet_saddr = addr->sin_addr.s_addr;
	if (chk_addr_ret == RTN_MULTICAST || chk_addr_ret == RTN_BROADCAST)
		inet->inet_saddr = 0;  /* Use device */

	/* Make sure we are allowed to bind here. */
	if (snum || !(inet->bind_address_no_port ||
		      (flags & BIND_FORCE_ADDRESS_NO_PORT))) {
		// 有端口或没有设置绑定地址不绑定端口的flags就会走到绑定端口的处理中

		// 有端口的情况下，需要检查端口是否已经占用，这一步要走到tcp自己的端口判断中
		if (sk->sk_prot->get_port(sk, snum)) {
			inet->inet_saddr = inet->inet_rcv_saddr = 0;
			err = -EADDRINUSE;
			goto out_release_sock;
		}
		if (!(flags & BIND_FROM_BPF)) {
			err = BPF_CGROUP_RUN_PROG_INET4_POST_BIND(sk);
			if (err) {
				inet->inet_saddr = inet->inet_rcv_saddr = 0;
				if (sk->sk_prot->put_port)
					sk->sk_prot->put_port(sk);
				goto out_release_sock;
			}
		}
	}

	if (inet->inet_rcv_saddr)
		sk->sk_userlocks |= SOCK_BINDADDR_LOCK;
	if (snum)
		sk->sk_userlocks |= SOCK_BINDPORT_LOCK;
	inet->inet_sport = htons(inet->inet_num);
	inet->inet_daddr = 0;
	inet->inet_dport = 0;
	sk_dst_reset(sk);
	err = 0;
out_release_sock:
	if (flags & BIND_WITH_LOCK)
		release_sock(sk);
out:
	return err;
}
```

- `sk_prot->get_port`检查端口是否可用，tcp的调用到 [inet_sck_get_port](h/docs/linux-kernel/net/ipv4/tcp/#3-bind--sk_prot-get_port-%E6%A3%80%E6%9F%A5%E7%AB%AF%E5%8F%A3%E6%98%AF%E5%90%A6%E5%8F%AF%E7%94%A8)

## 3. listen

### 3.1. 定义

- tcp才有listen，udp和raw协议都没有listen

```cpp
// net/ipv4/af_inet.c
const struct proto_ops inet_stream_ops = {
	...
	.listen        = inet_listen,
	...
};

// net/ipv4/af_inet.c
const struct proto_ops inet_dgram_ops = {
	...
	.listen		   = sock_no_listen,
	...
};

// net/ipv4/af_inet.c
/*
 * For SOCK_RAW sockets; should be the same as inet_dgram_ops but without
 * udp_poll
 */
const struct proto_ops inet_sockraw_ops = {
	...
	.listen		   = sock_no_listen,
	...
};
```

#### sock_no_listen

```cpp
// net/core/sock.c
int sock_no_listen(struct socket *sock, int backlog)
{
	return -EOPNOTSUPP;
}
EXPORT_SYMBOL(sock_no_listen);
```

### 3.2. inet_listen

- 会给socket分配backlog队列长度，用于存储sync包进来的socket

```cpp
// net/ipv4/af_inet.c
/*
 *	Move a socket into listening state.
 */
int inet_listen(struct socket *sock, int backlog)
{
	struct sock *sk = sock->sk;
	unsigned char old_state;
	int err, tcp_fastopen;

	lock_sock(sk);

	err = -EINVAL;
	if (sock->state != SS_UNCONNECTED || sock->type != SOCK_STREAM)
		goto out;

	old_state = sk->sk_state;
	if (!((1 << old_state) & (TCPF_CLOSE | TCPF_LISTEN)))
		goto out;

	WRITE_ONCE(sk->sk_max_ack_backlog, backlog);
	/* Really, if the socket is already in listen state
	 * we can only allow the backlog to be adjusted.
	 */
	if (old_state != TCP_LISTEN) {
		/* Enable TFO w/o requiring TCP_FASTOPEN socket option.
		 * Note that only TCP sockets (SOCK_STREAM) will reach here.
		 * Also fastopen backlog may already been set via the option
		 * because the socket was in TCP_LISTEN state previously but
		 * was shutdown() rather than close().
		 */
		tcp_fastopen = READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_fastopen);
		if ((tcp_fastopen & TFO_SERVER_WO_SOCKOPT1) &&
		    (tcp_fastopen & TFO_SERVER_ENABLE) &&
		    !inet_csk(sk)->icsk_accept_queue.fastopenq.max_qlen) {
			fastopen_queue_tune(sk, backlog);
			tcp_fastopen_init_key_once(sock_net(sk));
		}

		err = inet_csk_listen_start(sk);
		if (err)
			goto out;
		tcp_call_bpf(sk, BPF_SOCK_OPS_TCP_LISTEN_CB, 0, NULL);
	}
	err = 0;

out:
	release_sock(sk);
	return err;
}
EXPORT_SYMBOL(inet_listen);
```

### 3.3. inet_csk_listen_start

- 设置状态到`TCP_LISTEN`

```cpp
// net/ipv4/inet_connection_sock.c
int inet_csk_listen_start(struct sock *sk)
{
	struct inet_connection_sock *icsk = inet_csk(sk);
	struct inet_sock *inet = inet_sk(sk);
	int err = -EADDRINUSE;

	reqsk_queue_alloc(&icsk->icsk_accept_queue);

	sk->sk_ack_backlog = 0;
	inet_csk_delack_init(sk);

	if (sk->sk_txrehash == SOCK_TXREHASH_DEFAULT)
		sk->sk_txrehash = READ_ONCE(sock_net(sk)->core.sysctl_txrehash);

	/* There is race window here: we announce ourselves listening,
	 * but this transition is still not validated by get_port().
	 * It is OK, because this socket enters to hash table only
	 * after validation is complete.
	 */
	inet_sk_state_store(sk, TCP_LISTEN);
	if (!sk->sk_prot->get_port(sk, inet->inet_num)) {
		inet->inet_sport = htons(inet->inet_num);

		sk_dst_reset(sk);
		err = sk->sk_prot->hash(sk);

		if (likely(!err))
			return 0;
	}

	inet_sk_set_state(sk, TCP_CLOSE);
	return err;
}
EXPORT_SYMBOL_GPL(inet_csk_listen_start);
```
