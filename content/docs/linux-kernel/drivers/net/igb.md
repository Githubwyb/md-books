# 一、igb操作结构体

```cpp
// drivers/net/ethernet/intel/igb/igb_main.c
static const struct net_device_ops igb_netdev_ops = {
	.ndo_open		= igb_open,
	.ndo_stop		= igb_close,
	.ndo_start_xmit		= igb_xmit_frame,
	.ndo_get_stats64	= igb_get_stats64,
	.ndo_set_rx_mode	= igb_set_rx_mode,
	.ndo_set_mac_address	= igb_set_mac,
	.ndo_change_mtu		= igb_change_mtu,
	.ndo_eth_ioctl		= igb_ioctl,
	.ndo_tx_timeout		= igb_tx_timeout,
	.ndo_validate_addr	= eth_validate_addr,
	.ndo_vlan_rx_add_vid	= igb_vlan_rx_add_vid,
	.ndo_vlan_rx_kill_vid	= igb_vlan_rx_kill_vid,
	.ndo_set_vf_mac		= igb_ndo_set_vf_mac,
	.ndo_set_vf_vlan	= igb_ndo_set_vf_vlan,
	.ndo_set_vf_rate	= igb_ndo_set_vf_bw,
	.ndo_set_vf_spoofchk	= igb_ndo_set_vf_spoofchk,
	.ndo_set_vf_trust	= igb_ndo_set_vf_trust,
	.ndo_get_vf_config	= igb_ndo_get_vf_config,
	.ndo_fix_features	= igb_fix_features,
	.ndo_set_features	= igb_set_features,
	.ndo_fdb_add		= igb_ndo_fdb_add,
	.ndo_features_check	= igb_features_check,
	.ndo_setup_tc		= igb_setup_tc,
	.ndo_bpf		= igb_xdp,
	.ndo_xdp_xmit		= igb_xdp_xmit,
};
```

# 二、启动过程

## 1. `.ndo_open = igb_open`

```cpp
// drivers/net/ethernet/intel/igb/igb_main.c
int igb_open(struct net_device *netdev)
{
	return __igb_open(netdev, false);
}
```

- open里面最重要的就是这个注册硬中断

```cpp
// drivers/net/ethernet/intel/igb/igb_main.c
/**
 *  __igb_open - Called when a network interface is made active
 *  @netdev: network interface device structure
 *  @resuming: indicates whether we are in a resume call
 *
 *  Returns 0 on success, negative value on failure
 *
 *  The open entry point is called when a network interface is made
 *  active by the system (IFF_UP).  At this point all resources needed
 *  for transmit and receive operations are allocated, the interrupt
 *  handler is registered with the OS, the watchdog timer is started,
 *  and the stack is notified that the interface is ready.
 **/
static int __igb_open(struct net_device *netdev, bool resuming)
{
    ...
    // 注册中断
	err = igb_request_irq(adapter);
	if (err)
		goto err_req_irq;
    ...
}
```

- 调用`igb_request_msix`注册中断

```cpp
// drivers/net/ethernet/intel/igb/igb_main.c
/**
 *  igb_request_irq - initialize interrupts
 *  @adapter: board private structure to initialize
 *
 *  Attempts to configure interrupts using the best available
 *  capabilities of the hardware and kernel.
 **/
static int igb_request_irq(struct igb_adapter *adapter)
{
    ...
    if (adapter->flags & IGB_FLAG_HAS_MSIX) {
		err = igb_request_msix(adapter);
    ...
    }
    ...
}
```

- 注册`igb_msix_ring`处理函数

```cpp
// drivers/net/ethernet/intel/igb/igb_main.c
/**
 *  igb_request_msix - Initialize MSI-X interrupts
 *  @adapter: board private structure to initialize
 *
 *  igb_request_msix allocates MSI-X vectors and requests interrupts from the
 *  kernel.
 **/
static int igb_request_msix(struct igb_adapter *adapter)
{
    ...
	for (i = 0; i < num_q_vectors; i++) {
        ...
		err = request_irq(adapter->msix_entries[vector].vector,
				  igb_msix_ring, 0, q_vector->name,
				  q_vector);
		if (err)
			goto err_free;
	}
    ...
}
```

- 在`igb_msix_ring`中就是设置软中断`NET_RX_SOFTIRQ`

```cpp
// drivers/net/ethernet/intel/igb/igb_main.c
static irqreturn_t igb_msix_ring(int irq, void *data)
{
	struct igb_q_vector *q_vector = data;

	/* Write the ITR value calculated from the previous interrupt. */
	igb_write_itr(q_vector);

	napi_schedule(&q_vector->napi);

	return IRQ_HANDLED;
}

// include/linux/netdevice.h
/**
 *	napi_schedule - schedule NAPI poll
 *	@n: NAPI context
 *
 * Schedule NAPI poll routine to be called if it is not already
 * running.
 */
static inline void napi_schedule(struct napi_struct *n)
{
	if (napi_schedule_prep(n))
		__napi_schedule(n);
}

// net/core/dev.c
/**
 * __napi_schedule - schedule for receive
 * @n: entry to schedule
 *
 * The entry's receive function will be scheduled to run.
 * Consider using __napi_schedule_irqoff() if hard irqs are masked.
 */
void __napi_schedule(struct napi_struct *n)
{
	unsigned long flags;

	local_irq_save(flags);
	____napi_schedule(this_cpu_ptr(&softnet_data), n);
	local_irq_restore(flags);
}
EXPORT_SYMBOL(__napi_schedule);

// net/core/dev.c
/* Called with irq disabled */
static inline void ____napi_schedule(struct softnet_data *sd,
				     struct napi_struct *napi)
{
	struct task_struct *thread;

	lockdep_assert_irqs_disabled();

	if (test_bit(NAPI_STATE_THREADED, &napi->state)) {
		/* Paired with smp_mb__before_atomic() in
		 * napi_enable()/dev_set_threaded().
		 * Use READ_ONCE() to guarantee a complete
		 * read on napi->thread. Only call
		 * wake_up_process() when it's not NULL.
		 */
		thread = READ_ONCE(napi->thread);
		if (thread) {
			/* Avoid doing set_bit() if the thread is in
			 * INTERRUPTIBLE state, cause napi_thread_wait()
			 * makes sure to proceed with napi polling
			 * if the thread is explicitly woken from here.
			 */
			if (READ_ONCE(thread->__state) != TASK_INTERRUPTIBLE)
				set_bit(NAPI_STATE_SCHED_THREADED, &napi->state);
			wake_up_process(thread);
			return;
		}
	}

	list_add_tail(&napi->poll_list, &sd->poll_list);
    // 这里设置软中断NET_RX_SOFTIRQ
	__raise_softirq_irqoff(NET_RX_SOFTIRQ);
}
```
