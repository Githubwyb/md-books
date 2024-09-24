---
title: "1. netfilter驱动使用sk错误引发宕机"
---

# 一、堆栈信息

```
[28772.702878] BUG: unable to handle kernel paging request at 0000000400080040
[28772.703475] PGD 0 P4D 0
[28772.703614] Oops: 0000 [#1] SMP PTI
[28772.703806] CPU: 6 PID: 96951 Comm: sdptun Kdump: loaded Tainted: G        W  OE     4.19.181 #6
[28772.704255] Hardware name: Bochs Bochs, BIOS 1.13.0-20201211_142035 04/01/2014
[28772.704635] RIP: 0010:tcp_md5_do_lookup+0x15/0x130
[28772.704881] Code: 04 00 00 0f a3 c2 73 01 c3 e9 37 ff ff ff 0f 1f 80 00 00 00 00 66 66 66 66 90 48 8b 87 40 08 00 00 48 85 c0 0f 84 e4 00 00 00 <48> 8b 38 31 c0 48 85 ff 74 62 41 bb 40 00 00 00 49 c7 c2 ff ff ff
[28772.705826] RSP: 0018:ffff957075d83d20 EFLAGS: 00010202
[28772.706093] RAX: 0000000400080040 RBX: ffff956fdfa56118 RCX: 0000000000000001
[28772.706454] RDX: 0000000000000002 RSI: ffff956fdfa56118 RDI: ffff956fbcf3aa80
[28772.706866] RBP: ffff956fdfa5610c R08: 0000000000000001 R09: 000000000000ebb5
[28772.707244] R10: 000000000100007f R11: 000000000000c352 R12: ffff956fbcf3aa80
[28772.707604] R13: ffff956f600ce000 R14: ffff956fdfa56120 R15: ffff956fdfa5610c
[28772.707985] FS:  00007f32b003d740(0000) GS:ffff957075d80000(0000) knlGS:0000000000000000
[28772.708395] CS:  0010 DS: 0000 ES: 0000 CR0: 0000000080050033
[28772.708740] CR2: 0000000400080040 CR3: 00000002263ca006 CR4: 00000000000206e0
[28772.709112] DR0: 0000000000000000 DR1: 0000000000000000 DR2: 0000000000000000
[28772.709473] DR3: 0000000000000000 DR6: 00000000fffe0ff0 DR7: 0000000000000400
[28772.709834] Call Trace:
[28772.709979]  <IRQ>
[28772.710090]  tcp_v4_inbound_md5_hash+0x5c/0x160
[28772.710336]  tcp_v4_rcv+0x565/0xc00
[28772.710521]  ip_local_deliver_finish+0x61/0x1e0
[28772.710766]  ip_local_deliver+0xe0/0xf0
[28772.711016]  ? ip_sublist_rcv_finish+0x80/0x80
[28772.711301]  ip_rcv+0xbc/0xd0
[28772.711458]  ? ip_rcv_finish_core.isra.18+0x360/0x360
[28772.711719]  __netif_receive_skb_one_core+0x5a/0x80
[28772.711982]  process_backlog+0xaa/0x160
[28772.712182]  net_rx_action+0x149/0x3b0
[28772.712379]  ? sched_clock+0x5/0x10
[28772.712577]  __do_softirq+0xe3/0x2eb
[28772.712766]  do_softirq_own_stack+0x2a/0x40
[28772.712982]  </IRQ>
[28772.713106]  do_softirq.part.15+0x4f/0x60
[28772.713326]  __local_bh_enable_ip+0x60/0x70
[28772.713595]  ip_finish_output2+0x1a7/0x430
[28772.713811]  ? ip_finish_output+0x13a/0x280
[28772.714033]  ip_output+0x6c/0xe0
[28772.714208]  ? ip_fragment.constprop.50+0x80/0x80
[28772.714450]  __ip_queue_xmit+0x15d/0x410
[28772.714665]  __tcp_transmit_skb+0x528/0xaf0
[28772.714882]  tcp_rcv_state_process+0xbc2/0xda0
[28772.715122]  tcp_v4_do_rcv+0xb4/0x1e0
[28772.715314]  __release_sock+0x7c/0xd0
[28772.715516]  release_sock+0x2b/0x90
[28772.715700]  inet_stream_connect+0x41/0x50
[28772.715983]  __sys_connect+0xd0/0x100
[28772.716177]  ? syscall_trace_enter+0x1d3/0x2b0
[28772.716406]  __x64_sys_connect+0x16/0x20
[28772.716610]  do_syscall_64+0x5f/0x1e0
[28772.716801]  ? async_page_fault+0x8/0x30
[28772.717006]  entry_SYSCALL_64_after_hwframe+0x44/0xa9
[28772.717265] RIP: 0033:0x7f32afa0fcd5
[28772.717452] Code: 64 89 02 b8 ff ff ff ff eb ba 66 2e 0f 1f 84 00 00 00 00 00 90 f3 0f 1e fa 8b 05 76 d7 20 00 85 c0 75 12 b8 2a 00 00 00 0f 05 <48> 3d 00 f0 ff ff 77 53 c3 66 90 41 54 41 89 d4 55 48 89 f5 53 89
[28772.718398] RSP: 002b:00007ffef365ce88 EFLAGS: 00000246 ORIG_RAX: 000000000000002a
[28772.718781] RAX: ffffffffffffffda RBX: 00007f329838ef80 RCX: 00007f32afa0fcd5
[28772.719155] RDX: 0000000000000010 RSI: 000055af9e8e26a0 RDI: 000000000000017f
[28772.719570] RBP: 00007f3299512df8 R08: 0000000000000004 R09: 0000000000000070
[28772.719930] R10: 00007ffef365ce5c R11: 0000000000000246 R12: 000000000000017f
[28772.720292] R13: 00007f32990ecd30 R14: 00007f32992fcd30 R15: 0000000000000001
[28772.720682] Modules linked in: sdp_toa(OE) nfnetlink_queue tun xt_addrtype br_netfilter overlay bridge stp llc xt_TEE nf_dup_ipv6 nf_dup_ipv4 xt_TPROXY nf_tproxy_ipv6 nf_tproxy_ipv4 veth tcp_diag udp_diag inet_diag ipt_MASQUERADE xt_nat xt_multiport xt_socket nf_socket_ipv4 nf_socket_ipv6 nf_conntrack_netlink xt_HL xt_hl xt_set xt_comment xt_owner xt_connmark xt_mark ip6t_REJECT nf_reject_ipv6 ipt_REJECT nf_reject_ipv4 xt_conntrack nft_counter nft_chain_nat_ipv6 nf_nat_ipv6 nft_chain_route_ipv6 nft_chain_nat_ipv4 nf_nat_ipv4 nf_nat nft_chain_route_ipv4 ip_set_hash_netport ip_set_hash_net rfkill ip6_tables nft_compat ip_set nf_tables(E) nfnetlink igb i2c_algo_bit dca tcp_bbr sch_fq ip_vs nf_conntrack nf_defrag_ipv6 nf_defrag_ipv4 loop ext4 mbcache jbd2 joydev pcspkr i2c_piix4 ip_tables xfs libcrc32c
[28772.725085]  dm_crypt xts ata_generic crc32c_intel serio_raw virtio_net ata_piix net_failover virtio_console virtio_blk failover libata dm_mirror dm_region_hash dm_log dm_mod fuse [last unloaded: sdp_toa]
[28772.726001] CR2: 0000000400080040
```

# 二、分析堆栈信息

## 1. 首先正面分析堆栈

```shell
[28772.702878] BUG: unable to handle kernel paging request at 0000000400080040
```
```cpp
// arch/x86/mm/fault.c
static void
show_fault_oops(struct pt_regs *regs, unsigned long error_code,
		unsigned long address)
{
        ...
	pr_alert("BUG: unable to handle kernel %s at %px\n",
		 address < PAGE_SIZE ? "NULL pointer dereference" : "paging request",
		 (void *)address);

	dump_pagetable(address);
}
```

- 这个在网上查原因是地址非法，看起来地址和正常的地址确实不太一样，像sk的地址为0xffff956fbcf3aa80
- 使用crash命令调试vmcore

```shell
=> crash vmlinux /hislog/crash/kdump/127.0.0.1-2023-12-30-00\:40\:52/vmcore
...
      KERNEL: vmlinux
    DUMPFILE: /hislog/crash/kdump/127.0.0.1-2023-12-30-00:40:52/vmcore  [PARTIAL DUMP]
        CPUS: 8
        DATE: Sat Dec 30 00:40:46 2023
      UPTIME: 07:59:32
LOAD AVERAGE: 1.30, 1.30, 1.44
       TASKS: 1624
    NODENAME: aTrust
     RELEASE: 4.19.181
     VERSION: #6 SMP Thu Jun 16 04:03:14 CST 2022
     MACHINE: x86_64  (2194 Mhz)
      MEMORY: 8 GB
       PANIC: "BUG: unable to handle kernel paging request at 0000000400080040"
         PID: 96951
     COMMAND: "sdptun"
        TASK: ffff956fe2e65800  [THREAD_INFO: ffff956fe2e65800]
         CPU: 6
       STATE: TASK_RUNNING (PANIC)

crash> bt
PID: 96951  TASK: ffff956fe2e65800  CPU: 6   COMMAND: "sdptun"
 #0 [ffff957075d83a20] machine_kexec at ffffffff8e24baae
 #1 [ffff957075d83a78] __crash_kexec at ffffffff8e33eccd
 #2 [ffff957075d83b40] crash_kexec at ffffffff8e33fbad
 #3 [ffff957075d83b58] oops_end at ffffffff8e21fedd
 #4 [ffff957075d83b78] no_context at ffffffff8e25974c
 #5 [ffff957075d83bd0] __do_page_fault at ffffffff8e259e5e
 #6 [ffff957075d83c40] do_page_fault at ffffffff8e25a2f2
 #7 [ffff957075d83c70] async_page_fault at ffffffff8ec0119e
    [exception RIP: tcp_md5_do_lookup+21]
    RIP: ffffffff8e9ad3f5  RSP: ffff957075d83d20  RFLAGS: 00010202
    RAX: 0000000400080040  RBX: ffff956fdfa56118  RCX: 0000000000000001
    RDX: 0000000000000002  RSI: ffff956fdfa56118  RDI: ffff956fbcf3aa80
    RBP: ffff956fdfa5610c   R8: 0000000000000001   R9: 000000000000ebb5
    R10: 000000000100007f  R11: 000000000000c352  R12: ffff956fbcf3aa80
    R13: ffff956f600ce000  R14: ffff956fdfa56120  R15: ffff956fdfa5610c
    ORIG_RAX: ffffffffffffffff  CS: 0010  SS: 0018
 #8 [ffff957075d83d20] tcp_v4_inbound_md5_hash at ffffffff8e9adecc
 #9 [ffff957075d83d78] tcp_v4_rcv at ffffffff8e9af9a5
#10 [ffff957075d83de8] ip_local_deliver_finish at ffffffff8e985f61
#11 [ffff957075d83e08] ip_local_deliver at ffffffff8e986800
#12 [ffff957075d83e58] ip_rcv at ffffffff8e9868cc
#13 [ffff957075d83eb0] __netif_receive_skb_one_core at ffffffff8e92523a
#14 [ffff957075d83ed8] process_backlog at ffffffff8e92642a
#15 [ffff957075d83f10] net_rx_action at ffffffff8e9257c9
#16 [ffff957075d83f90] __softirqentry_text_start at ffffffff8ee000e3
#17 [ffff957075d83ff0] do_softirq_own_stack at ffffffff8ec00e9a
--- <IRQ stack> ---
#18 [ffffac70016cbbb0] do_softirq_own_stack at ffffffff8ec00e9a
    [exception RIP: unknown or invalid address]
    RIP: ffff956ff7c98000  RSP: ffff956fb117c240  RFLAGS: ffff956ff7c98348
    RAX: ffffffff8f5e0080  RBX: ffffac70016cbc50  RCX: 0000000000000000
    RDX: 0100007ff7c98348  RSI: e214a24fbc22aa00  RDI: ffffffff8e98b1ca
    RBP: ffff956f600ce000   R8: ffffffff8e989a87   R9: ffffffff8e2a7850
    R10: ffff957018d7c400  R11: ffffffff8e2a77df  R12: ffff957018d7c400
    R13: ffff956ff7c98000  R14: e214a24fbc22aa00  R15: 0000000000000000
    ORIG_RAX: ffff956f600ce000  CS: 0000  SS: ffffffff8f5e0080
bt: WARNING: possibly bogus exception frame
#19 [ffffac70016cbc58] ip_output at ffffffff8e98bd4c
#20 [ffffac70016cbcb0] __ip_queue_xmit at ffffffff8e98b7ad
#21 [ffffac70016cbd08] __tcp_transmit_skb at ffffffff8e9a5e48
#22 [ffffac70016cbd78] tcp_rcv_state_process at ffffffff8e9a3c12
#23 [ffffac70016cbde8] tcp_v4_do_rcv at ffffffff8e9ae494
#24 [ffffac70016cbe08] __release_sock at ffffffff8e907c8c
#25 [ffffac70016cbe30] release_sock at ffffffff8e907d0b
#26 [ffffac70016cbe48] inet_stream_connect at ffffffff8e9c6bd1
#27 [ffffac70016cbe70] __sys_connect at ffffffff8e902cd0
#28 [ffffac70016cbf28] __x64_sys_connect at ffffffff8e902d16
#29 [ffffac70016cbf30] do_syscall_64 at ffffffff8e203eef
#30 [ffffac70016cbf50] entry_SYSCALL_64_after_hwframe at ffffffff8ec00088
    RIP: 00007f32afa0fcd5  RSP: 00007ffef365ce88  RFLAGS: 00000246
    RAX: ffffffffffffffda  RBX: 00007f329838ef80  RCX: 00007f32afa0fcd5
    RDX: 0000000000000010  RSI: 000055af9e8e26a0  RDI: 000000000000017f
    RBP: 00007f3299512df8   R8: 0000000000000004   R9: 0000000000000070
    R10: 00007ffef365ce5c  R11: 0000000000000246  R12: 000000000000017f
    R13: 00007f32990ecd30  R14: 00007f32992fcd30  R15: 0000000000000001
    ORIG_RAX: 000000000000002a  CS: 0033  SS: 002b
```

- 堆栈位置

```
crash> dis -l tcp_md5_do_lookup+21 5
/root/hdc/hardware/linux_kernel_4.19.181/linux-4.19.181/./include/linux/compiler.h: 207
0xffffffff8e9ad3f5 <tcp_md5_do_lookup+21>:      mov    (%rax),%rdi
/root/hdc/hardware/linux_kernel_4.19.181/linux-4.19.181/net/ipv4/tcp_ipv4.c: 994
0xffffffff8e9ad3f8 <tcp_md5_do_lookup+24>:      xor    %eax,%eax
0xffffffff8e9ad3fa <tcp_md5_do_lookup+26>:      test   %rdi,%rdi
0xffffffff8e9ad3fd <tcp_md5_do_lookup+29>:      je     0xffffffff8e9ad461 <tcp_md5_do_lookup+129>
0xffffffff8e9ad3ff <tcp_md5_do_lookup+31>:      mov    $0x40,%r11d
```

```cpp
// net/ipv4/tcp_ipv4.c
/* Find the Key structure for an address.  */
struct tcp_md5sig_key *tcp_md5_do_lookup(const struct sock *sk,
					 const union tcp_md5_addr *addr,
					 int family)
{
	const struct tcp_sock *tp = tcp_sk(sk);
	struct tcp_md5sig_key *key;
	const struct tcp_md5sig_info *md5sig;
	__be32 mask;
	struct tcp_md5sig_key *best_match = NULL;
	bool match;

	/* caller either holds rcu_read_lock() or socket lock */
	md5sig = rcu_dereference_check(tp->md5sig_info,
				       lockdep_sock_is_held(sk));
	if (!md5sig)
		return NULL;

	hlist_for_each_entry_rcu(key, &md5sig->head, node) {
                ...
	}
	return best_match;
}
EXPORT_SYMBOL(tcp_md5_do_lookup);

// include/linux/compiler.h
#define __READ_ONCE_SIZE						\
({									\
	switch (size) {							\
	case 1: *(__u8 *)res = *(volatile __u8 *)p; break;		\
	case 2: *(__u16 *)res = *(volatile __u16 *)p; break;		\
	case 4: *(__u32 *)res = *(volatile __u32 *)p; break;		\
	case 8: *(__u64 *)res = *(volatile __u64 *)p; break;		\
	default:							\
		barrier();						\
		__builtin_memcpy((void *)res, (const void *)p, size);	\
		barrier();						\
	}								\
})

static __always_inline
void __read_once_size(const volatile void *p, void *res, int size)
{
	__READ_ONCE_SIZE;
}
```

- 从堆栈分析和代码上看，应该是`tp->md5sig_info`存在问题
- 堆栈看是收包到协议栈的tcp处理时
- 这个变量我们没有动，驱动里面最多修改skb但是也是发出去的，和收包应该没关系
- 修改的sk结构体的sk_user_data和skc_flags，上面的md5sig_info是tcp_sock中的，和前面两个结构体应该没关系

**怀疑点**

- 踩内存
    - 跑一下kasan的分析
- 收包时复用了sk，sk的标记不对导致修改错了包而出现问题
    - 优化代码，判断一下sk的状态，跑一下能否复现

## 2. 验证结果

- kasan确实发现踩内存了，踩内存代码在这里

```cpp
    // 只处理tcp协议包
    if (!sk || sk->sk_protocol != IPPROTO_TCP) {
        return NF_ACCEPT;
    }
```

- 堆栈是在发送syn/ack时，要不是之前理过内核代码，都没想到这个时候的sock结构体是request_sock
- request_sock结构体比sock结构体少了好多东西，所以这里的sk_protocol其实已经越界了，具体是不是IPPROTO_TCP就不一定了
- 而request_sock结构体中的sk_flags是使用的skc_listener指针，指针的第30位是否为1也是不确定的
- 写了代码验证确实可能在request_sock中进入到设置toa的逻辑，而request_sock也没有sk_user_data，sk_flags也是指针地址，驱动中正好改了这两个，sk_user_data清零，sk_flags的第30位置0
- 那么，一个是越界，一个是指针地址不对了，要么改了其他内存，要么free了其他内存且内存泄漏，完美的崩溃

# 三、结论

- netfilter的hook中，sock结构体指针指向的可能不是我们认为的`struct sock`，也可能是`struct request_sock`或`struct `，源码分析见 [minisock 缩减版本的socket](/docs/linux/linux-kernel/net/socket/socket/#13-minisock-缩减版本的socket)
- 写netfilter驱动时，需要先对sock结构体指针做判断

```cpp
    // 这里需要判断sock是否是完整的，只有完整的sock中flag才是真的flag
    // 非完整的request_sock中flag是skc_listener
    // 非完整的inet_timewait_sock中flag是skc_tw_dr
    // 只处理ipv4
    if (!sk || !sk_fullsock(sk) || sk->sk_family != PF_INET) {
        return NF_ACCEPT;
    }
```
