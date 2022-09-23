---
weight: 10
---

# 一、ipv4收包后如何处理

## 1. ip层包入口

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

# 二、ipv4的socket创建后如何进行收包

## 1. tcp包

- socket创建的时候会调用`pf->create`对应ipv4的`inet_create`
