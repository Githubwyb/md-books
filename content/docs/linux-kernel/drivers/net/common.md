---
weight: 1
title: "通用网络驱动开发知识"
---

# 一、驱动到网络协议栈处理过程

```plantuml
@startuml
box kernel #White
    participant net
    participant ksoftirqd
end box
box driver #White
    participant eth
end box
participant cpu

autonumber
net -> eth: net_device_ops::ndo_open
eth -> cpu: 注册硬件中断处理函数
eth -> net: 调用netif_napi_add注册poll函数到napi列表里面

== 收到包 ==
autonumber 1
cpu -> eth: 来中断了
eth -> ksoftirqd: 设置软中断NET_RX_SOFTIRQ
ksoftirqd -> net: 根据软中断类型调用net_rx_action
net -> eth: 从napi列表中遍历处理，找到对应的poll函数
eth -> eth: 从硬件buffer中读取数据帧创建sk_buff
eth -> net: 将sk_buff通过函数napi_gro_receive调用到内核
net -> net: napi_gro_receive => napi_skb_finish
net -> net: napi_skb_finish => netif_receive_skb

@enduml
```

# 二、驱动定义

## 1. 驱动操作结构体 net_device_ops

- 每一个网卡需要定义下面这一系列操作函数

```cpp
// include/linux/netdevice.h
/*
 * This structure defines the management hooks for network devices.
 * The following hooks can be defined; unless noted otherwise, they are
 * optional and can be filled with a null pointer.
 *
 * int (*ndo_init)(struct net_device *dev);
 *     This function is called once when a network device is registered.
 *     The network device can use this for any late stage initialization
 *     or semantic validation. It can fail with an error code which will
 *     be propagated back to register_netdev.
 *
 * void (*ndo_uninit)(struct net_device *dev);
 *     This function is called when device is unregistered or when registration
 *     fails. It is not called if init fails.
 *
 * int (*ndo_open)(struct net_device *dev);
 *     This function is called when a network device transitions to the up
 *     state.
 *
 * int (*ndo_stop)(struct net_device *dev);
 *     This function is called when a network device transitions to the down
 *     state.
 *
 * netdev_tx_t (*ndo_start_xmit)(struct sk_buff *skb,
 *                               struct net_device *dev);
 *	Called when a packet needs to be transmitted.
 *	Returns NETDEV_TX_OK.  Can return NETDEV_TX_BUSY, but you should stop
 *	the queue before that can happen; it's for obsolete devices and weird
 *	corner cases, but the stack really does a non-trivial amount
 *	of useless work if you return NETDEV_TX_BUSY.
 *	Required; cannot be NULL.
 *
 * netdev_features_t (*ndo_features_check)(struct sk_buff *skb,
 *					   struct net_device *dev
 *					   netdev_features_t features);
 *	Called by core transmit path to determine if device is capable of
 *	performing offload operations on a given packet. This is to give
 *	the device an opportunity to implement any restrictions that cannot
 *	be otherwise expressed by feature flags. The check is called with
 *	the set of features that the stack has calculated and it returns
 *	those the driver believes to be appropriate.
 *
 * u16 (*ndo_select_queue)(struct net_device *dev, struct sk_buff *skb,
 *                         struct net_device *sb_dev);
 *	Called to decide which queue to use when device supports multiple
 *	transmit queues.
 *
 * void (*ndo_change_rx_flags)(struct net_device *dev, int flags);
 *	This function is called to allow device receiver to make
 *	changes to configuration when multicast or promiscuous is enabled.
 *
 * void (*ndo_set_rx_mode)(struct net_device *dev);
 *	This function is called device changes address list filtering.
 *	If driver handles unicast address filtering, it should set
 *	IFF_UNICAST_FLT in its priv_flags.
 *
 * int (*ndo_set_mac_address)(struct net_device *dev, void *addr);
 *	This function  is called when the Media Access Control address
 *	needs to be changed. If this interface is not defined, the
 *	MAC address can not be changed.
 *
 * int (*ndo_validate_addr)(struct net_device *dev);
 *	Test if Media Access Control address is valid for the device.
 *
 * int (*ndo_do_ioctl)(struct net_device *dev, struct ifreq *ifr, int cmd);
 *	Old-style ioctl entry point. This is used internally by the
 *	appletalk and ieee802154 subsystems but is no longer called by
 *	the device ioctl handler.
 *
 * int (*ndo_siocbond)(struct net_device *dev, struct ifreq *ifr, int cmd);
 *	Used by the bonding driver for its device specific ioctls:
 *	SIOCBONDENSLAVE, SIOCBONDRELEASE, SIOCBONDSETHWADDR, SIOCBONDCHANGEACTIVE,
 *	SIOCBONDSLAVEINFOQUERY, and SIOCBONDINFOQUERY
 *
 * * int (*ndo_eth_ioctl)(struct net_device *dev, struct ifreq *ifr, int cmd);
 *	Called for ethernet specific ioctls: SIOCGMIIPHY, SIOCGMIIREG,
 *	SIOCSMIIREG, SIOCSHWTSTAMP and SIOCGHWTSTAMP.
 *
 * int (*ndo_set_config)(struct net_device *dev, struct ifmap *map);
 *	Used to set network devices bus interface parameters. This interface
 *	is retained for legacy reasons; new devices should use the bus
 *	interface (PCI) for low level management.
 *
 * int (*ndo_change_mtu)(struct net_device *dev, int new_mtu);
 *	Called when a user wants to change the Maximum Transfer Unit
 *	of a device.
 *
 * void (*ndo_tx_timeout)(struct net_device *dev, unsigned int txqueue);
 *	Callback used when the transmitter has not made any progress
 *	for dev->watchdog ticks.
 *
 * void (*ndo_get_stats64)(struct net_device *dev,
 *                         struct rtnl_link_stats64 *storage);
 * struct net_device_stats* (*ndo_get_stats)(struct net_device *dev);
 *	Called when a user wants to get the network device usage
 *	statistics. Drivers must do one of the following:
 *	1. Define @ndo_get_stats64 to fill in a zero-initialised
 *	   rtnl_link_stats64 structure passed by the caller.
 *	2. Define @ndo_get_stats to update a net_device_stats structure
 *	   (which should normally be dev->stats) and return a pointer to
 *	   it. The structure may be changed asynchronously only if each
 *	   field is written atomically.
 *	3. Update dev->stats asynchronously and atomically, and define
 *	   neither operation.
 *
 * bool (*ndo_has_offload_stats)(const struct net_device *dev, int attr_id)
 *	Return true if this device supports offload stats of this attr_id.
 *
 * int (*ndo_get_offload_stats)(int attr_id, const struct net_device *dev,
 *	void *attr_data)
 *	Get statistics for offload operations by attr_id. Write it into the
 *	attr_data pointer.
 *
 * int (*ndo_vlan_rx_add_vid)(struct net_device *dev, __be16 proto, u16 vid);
 *	If device supports VLAN filtering this function is called when a
 *	VLAN id is registered.
 *
 * int (*ndo_vlan_rx_kill_vid)(struct net_device *dev, __be16 proto, u16 vid);
 *	If device supports VLAN filtering this function is called when a
 *	VLAN id is unregistered.
 *
 * void (*ndo_poll_controller)(struct net_device *dev);
 *
 *	SR-IOV management functions.
 * int (*ndo_set_vf_mac)(struct net_device *dev, int vf, u8* mac);
 * int (*ndo_set_vf_vlan)(struct net_device *dev, int vf, u16 vlan,
 *			  u8 qos, __be16 proto);
 * int (*ndo_set_vf_rate)(struct net_device *dev, int vf, int min_tx_rate,
 *			  int max_tx_rate);
 * int (*ndo_set_vf_spoofchk)(struct net_device *dev, int vf, bool setting);
 * int (*ndo_set_vf_trust)(struct net_device *dev, int vf, bool setting);
 * int (*ndo_get_vf_config)(struct net_device *dev,
 *			    int vf, struct ifla_vf_info *ivf);
 * int (*ndo_set_vf_link_state)(struct net_device *dev, int vf, int link_state);
 * int (*ndo_set_vf_port)(struct net_device *dev, int vf,
 *			  struct nlattr *port[]);
 *
 *      Enable or disable the VF ability to query its RSS Redirection Table and
 *      Hash Key. This is needed since on some devices VF share this information
 *      with PF and querying it may introduce a theoretical security risk.
 * int (*ndo_set_vf_rss_query_en)(struct net_device *dev, int vf, bool setting);
 * int (*ndo_get_vf_port)(struct net_device *dev, int vf, struct sk_buff *skb);
 * int (*ndo_setup_tc)(struct net_device *dev, enum tc_setup_type type,
 *		       void *type_data);
 *	Called to setup any 'tc' scheduler, classifier or action on @dev.
 *	This is always called from the stack with the rtnl lock held and netif
 *	tx queues stopped. This allows the netdevice to perform queue
 *	management safely.
 *
 *	Fiber Channel over Ethernet (FCoE) offload functions.
 * int (*ndo_fcoe_enable)(struct net_device *dev);
 *	Called when the FCoE protocol stack wants to start using LLD for FCoE
 *	so the underlying device can perform whatever needed configuration or
 *	initialization to support acceleration of FCoE traffic.
 *
 * int (*ndo_fcoe_disable)(struct net_device *dev);
 *	Called when the FCoE protocol stack wants to stop using LLD for FCoE
 *	so the underlying device can perform whatever needed clean-ups to
 *	stop supporting acceleration of FCoE traffic.
 *
 * int (*ndo_fcoe_ddp_setup)(struct net_device *dev, u16 xid,
 *			     struct scatterlist *sgl, unsigned int sgc);
 *	Called when the FCoE Initiator wants to initialize an I/O that
 *	is a possible candidate for Direct Data Placement (DDP). The LLD can
 *	perform necessary setup and returns 1 to indicate the device is set up
 *	successfully to perform DDP on this I/O, otherwise this returns 0.
 *
 * int (*ndo_fcoe_ddp_done)(struct net_device *dev,  u16 xid);
 *	Called when the FCoE Initiator/Target is done with the DDPed I/O as
 *	indicated by the FC exchange id 'xid', so the underlying device can
 *	clean up and reuse resources for later DDP requests.
 *
 * int (*ndo_fcoe_ddp_target)(struct net_device *dev, u16 xid,
 *			      struct scatterlist *sgl, unsigned int sgc);
 *	Called when the FCoE Target wants to initialize an I/O that
 *	is a possible candidate for Direct Data Placement (DDP). The LLD can
 *	perform necessary setup and returns 1 to indicate the device is set up
 *	successfully to perform DDP on this I/O, otherwise this returns 0.
 *
 * int (*ndo_fcoe_get_hbainfo)(struct net_device *dev,
 *			       struct netdev_fcoe_hbainfo *hbainfo);
 *	Called when the FCoE Protocol stack wants information on the underlying
 *	device. This information is utilized by the FCoE protocol stack to
 *	register attributes with Fiber Channel management service as per the
 *	FC-GS Fabric Device Management Information(FDMI) specification.
 *
 * int (*ndo_fcoe_get_wwn)(struct net_device *dev, u64 *wwn, int type);
 *	Called when the underlying device wants to override default World Wide
 *	Name (WWN) generation mechanism in FCoE protocol stack to pass its own
 *	World Wide Port Name (WWPN) or World Wide Node Name (WWNN) to the FCoE
 *	protocol stack to use.
 *
 *	RFS acceleration.
 * int (*ndo_rx_flow_steer)(struct net_device *dev, const struct sk_buff *skb,
 *			    u16 rxq_index, u32 flow_id);
 *	Set hardware filter for RFS.  rxq_index is the target queue index;
 *	flow_id is a flow ID to be passed to rps_may_expire_flow() later.
 *	Return the filter ID on success, or a negative error code.
 *
 *	Slave management functions (for bridge, bonding, etc).
 * int (*ndo_add_slave)(struct net_device *dev, struct net_device *slave_dev);
 *	Called to make another netdev an underling.
 *
 * int (*ndo_del_slave)(struct net_device *dev, struct net_device *slave_dev);
 *	Called to release previously enslaved netdev.
 *
 * struct net_device *(*ndo_get_xmit_slave)(struct net_device *dev,
 *					    struct sk_buff *skb,
 *					    bool all_slaves);
 *	Get the xmit slave of master device. If all_slaves is true, function
 *	assume all the slaves can transmit.
 *
 *      Feature/offload setting functions.
 * netdev_features_t (*ndo_fix_features)(struct net_device *dev,
 *		netdev_features_t features);
 *	Adjusts the requested feature flags according to device-specific
 *	constraints, and returns the resulting flags. Must not modify
 *	the device state.
 *
 * int (*ndo_set_features)(struct net_device *dev, netdev_features_t features);
 *	Called to update device configuration to new features. Passed
 *	feature set might be less than what was returned by ndo_fix_features()).
 *	Must return >0 or -errno if it changed dev->features itself.
 *
 * int (*ndo_fdb_add)(struct ndmsg *ndm, struct nlattr *tb[],
 *		      struct net_device *dev,
 *		      const unsigned char *addr, u16 vid, u16 flags,
 *		      struct netlink_ext_ack *extack);
 *	Adds an FDB entry to dev for addr.
 * int (*ndo_fdb_del)(struct ndmsg *ndm, struct nlattr *tb[],
 *		      struct net_device *dev,
 *		      const unsigned char *addr, u16 vid)
 *	Deletes the FDB entry from dev coresponding to addr.
 * int (*ndo_fdb_del_bulk)(struct ndmsg *ndm, struct nlattr *tb[],
 *			   struct net_device *dev,
 *			   u16 vid,
 *			   struct netlink_ext_ack *extack);
 * int (*ndo_fdb_dump)(struct sk_buff *skb, struct netlink_callback *cb,
 *		       struct net_device *dev, struct net_device *filter_dev,
 *		       int *idx)
 *	Used to add FDB entries to dump requests. Implementers should add
 *	entries to skb and update idx with the number of entries.
 *
 * int (*ndo_bridge_setlink)(struct net_device *dev, struct nlmsghdr *nlh,
 *			     u16 flags, struct netlink_ext_ack *extack)
 * int (*ndo_bridge_getlink)(struct sk_buff *skb, u32 pid, u32 seq,
 *			     struct net_device *dev, u32 filter_mask,
 *			     int nlflags)
 * int (*ndo_bridge_dellink)(struct net_device *dev, struct nlmsghdr *nlh,
 *			     u16 flags);
 *
 * int (*ndo_change_carrier)(struct net_device *dev, bool new_carrier);
 *	Called to change device carrier. Soft-devices (like dummy, team, etc)
 *	which do not represent real hardware may define this to allow their
 *	userspace components to manage their virtual carrier state. Devices
 *	that determine carrier state from physical hardware properties (eg
 *	network cables) or protocol-dependent mechanisms (eg
 *	USB_CDC_NOTIFY_NETWORK_CONNECTION) should NOT implement this function.
 *
 * int (*ndo_get_phys_port_id)(struct net_device *dev,
 *			       struct netdev_phys_item_id *ppid);
 *	Called to get ID of physical port of this device. If driver does
 *	not implement this, it is assumed that the hw is not able to have
 *	multiple net devices on single physical port.
 *
 * int (*ndo_get_port_parent_id)(struct net_device *dev,
 *				 struct netdev_phys_item_id *ppid)
 *	Called to get the parent ID of the physical port of this device.
 *
 * void* (*ndo_dfwd_add_station)(struct net_device *pdev,
 *				 struct net_device *dev)
 *	Called by upper layer devices to accelerate switching or other
 *	station functionality into hardware. 'pdev is the lowerdev
 *	to use for the offload and 'dev' is the net device that will
 *	back the offload. Returns a pointer to the private structure
 *	the upper layer will maintain.
 * void (*ndo_dfwd_del_station)(struct net_device *pdev, void *priv)
 *	Called by upper layer device to delete the station created
 *	by 'ndo_dfwd_add_station'. 'pdev' is the net device backing
 *	the station and priv is the structure returned by the add
 *	operation.
 * int (*ndo_set_tx_maxrate)(struct net_device *dev,
 *			     int queue_index, u32 maxrate);
 *	Called when a user wants to set a max-rate limitation of specific
 *	TX queue.
 * int (*ndo_get_iflink)(const struct net_device *dev);
 *	Called to get the iflink value of this device.
 * int (*ndo_fill_metadata_dst)(struct net_device *dev, struct sk_buff *skb);
 *	This function is used to get egress tunnel information for given skb.
 *	This is useful for retrieving outer tunnel header parameters while
 *	sampling packet.
 * void (*ndo_set_rx_headroom)(struct net_device *dev, int needed_headroom);
 *	This function is used to specify the headroom that the skb must
 *	consider when allocation skb during packet reception. Setting
 *	appropriate rx headroom value allows avoiding skb head copy on
 *	forward. Setting a negative value resets the rx headroom to the
 *	default value.
 * int (*ndo_bpf)(struct net_device *dev, struct netdev_bpf *bpf);
 *	This function is used to set or query state related to XDP on the
 *	netdevice and manage BPF offload. See definition of
 *	enum bpf_netdev_command for details.
 * int (*ndo_xdp_xmit)(struct net_device *dev, int n, struct xdp_frame **xdp,
 *			u32 flags);
 *	This function is used to submit @n XDP packets for transmit on a
 *	netdevice. Returns number of frames successfully transmitted, frames
 *	that got dropped are freed/returned via xdp_return_frame().
 *	Returns negative number, means general error invoking ndo, meaning
 *	no frames were xmit'ed and core-caller will free all frames.
 * struct net_device *(*ndo_xdp_get_xmit_slave)(struct net_device *dev,
 *					        struct xdp_buff *xdp);
 *      Get the xmit slave of master device based on the xdp_buff.
 * int (*ndo_xsk_wakeup)(struct net_device *dev, u32 queue_id, u32 flags);
 *      This function is used to wake up the softirq, ksoftirqd or kthread
 *	responsible for sending and/or receiving packets on a specific
 *	queue id bound to an AF_XDP socket. The flags field specifies if
 *	only RX, only Tx, or both should be woken up using the flags
 *	XDP_WAKEUP_RX and XDP_WAKEUP_TX.
 * struct devlink_port *(*ndo_get_devlink_port)(struct net_device *dev);
 *	Get devlink port instance associated with a given netdev.
 *	Called with a reference on the netdevice and devlink locks only,
 *	rtnl_lock is not held.
 * int (*ndo_tunnel_ctl)(struct net_device *dev, struct ip_tunnel_parm *p,
 *			 int cmd);
 *	Add, change, delete or get information on an IPv4 tunnel.
 * struct net_device *(*ndo_get_peer_dev)(struct net_device *dev);
 *	If a device is paired with a peer device, return the peer instance.
 *	The caller must be under RCU read context.
 * int (*ndo_fill_forward_path)(struct net_device_path_ctx *ctx, struct net_device_path *path);
 *     Get the forwarding path to reach the real device from the HW destination address
 * ktime_t (*ndo_get_tstamp)(struct net_device *dev,
 *			     const struct skb_shared_hwtstamps *hwtstamps,
 *			     bool cycles);
 *	Get hardware timestamp based on normal/adjustable time or free running
 *	cycle counter. This function is required if physical clock supports a
 *	free running cycle counter.
 */
struct net_device_ops {
	int			(*ndo_init)(struct net_device *dev);
	void			(*ndo_uninit)(struct net_device *dev);
	int			(*ndo_open)(struct net_device *dev);
	int			(*ndo_stop)(struct net_device *dev);
	netdev_tx_t		(*ndo_start_xmit)(struct sk_buff *skb,
						  struct net_device *dev);
	netdev_features_t	(*ndo_features_check)(struct sk_buff *skb,
						      struct net_device *dev,
						      netdev_features_t features);
	u16			(*ndo_select_queue)(struct net_device *dev,
						    struct sk_buff *skb,
						    struct net_device *sb_dev);
	void			(*ndo_change_rx_flags)(struct net_device *dev,
						       int flags);
	void			(*ndo_set_rx_mode)(struct net_device *dev);
	int			(*ndo_set_mac_address)(struct net_device *dev,
						       void *addr);
	int			(*ndo_validate_addr)(struct net_device *dev);
	int			(*ndo_do_ioctl)(struct net_device *dev,
					        struct ifreq *ifr, int cmd);
	int			(*ndo_eth_ioctl)(struct net_device *dev,
						 struct ifreq *ifr, int cmd);
	int			(*ndo_siocbond)(struct net_device *dev,
						struct ifreq *ifr, int cmd);
	int			(*ndo_siocwandev)(struct net_device *dev,
						  struct if_settings *ifs);
	int			(*ndo_siocdevprivate)(struct net_device *dev,
						      struct ifreq *ifr,
						      void __user *data, int cmd);
	int			(*ndo_set_config)(struct net_device *dev,
					          struct ifmap *map);
	int			(*ndo_change_mtu)(struct net_device *dev,
						  int new_mtu);
	int			(*ndo_neigh_setup)(struct net_device *dev,
						   struct neigh_parms *);
	void			(*ndo_tx_timeout) (struct net_device *dev,
						   unsigned int txqueue);

	void			(*ndo_get_stats64)(struct net_device *dev,
						   struct rtnl_link_stats64 *storage);
	bool			(*ndo_has_offload_stats)(const struct net_device *dev, int attr_id);
	int			(*ndo_get_offload_stats)(int attr_id,
							 const struct net_device *dev,
							 void *attr_data);
	struct net_device_stats* (*ndo_get_stats)(struct net_device *dev);

	int			(*ndo_vlan_rx_add_vid)(struct net_device *dev,
						       __be16 proto, u16 vid);
	int			(*ndo_vlan_rx_kill_vid)(struct net_device *dev,
						        __be16 proto, u16 vid);
#ifdef CONFIG_NET_POLL_CONTROLLER
	void                    (*ndo_poll_controller)(struct net_device *dev);
	int			(*ndo_netpoll_setup)(struct net_device *dev,
						     struct netpoll_info *info);
	void			(*ndo_netpoll_cleanup)(struct net_device *dev);
#endif
	int			(*ndo_set_vf_mac)(struct net_device *dev,
						  int queue, u8 *mac);
	int			(*ndo_set_vf_vlan)(struct net_device *dev,
						   int queue, u16 vlan,
						   u8 qos, __be16 proto);
	int			(*ndo_set_vf_rate)(struct net_device *dev,
						   int vf, int min_tx_rate,
						   int max_tx_rate);
	int			(*ndo_set_vf_spoofchk)(struct net_device *dev,
						       int vf, bool setting);
	int			(*ndo_set_vf_trust)(struct net_device *dev,
						    int vf, bool setting);
	int			(*ndo_get_vf_config)(struct net_device *dev,
						     int vf,
						     struct ifla_vf_info *ivf);
	int			(*ndo_set_vf_link_state)(struct net_device *dev,
							 int vf, int link_state);
	int			(*ndo_get_vf_stats)(struct net_device *dev,
						    int vf,
						    struct ifla_vf_stats
						    *vf_stats);
	int			(*ndo_set_vf_port)(struct net_device *dev,
						   int vf,
						   struct nlattr *port[]);
	int			(*ndo_get_vf_port)(struct net_device *dev,
						   int vf, struct sk_buff *skb);
	int			(*ndo_get_vf_guid)(struct net_device *dev,
						   int vf,
						   struct ifla_vf_guid *node_guid,
						   struct ifla_vf_guid *port_guid);
	int			(*ndo_set_vf_guid)(struct net_device *dev,
						   int vf, u64 guid,
						   int guid_type);
	int			(*ndo_set_vf_rss_query_en)(
						   struct net_device *dev,
						   int vf, bool setting);
	int			(*ndo_setup_tc)(struct net_device *dev,
						enum tc_setup_type type,
						void *type_data);
#if IS_ENABLED(CONFIG_FCOE)
	int			(*ndo_fcoe_enable)(struct net_device *dev);
	int			(*ndo_fcoe_disable)(struct net_device *dev);
	int			(*ndo_fcoe_ddp_setup)(struct net_device *dev,
						      u16 xid,
						      struct scatterlist *sgl,
						      unsigned int sgc);
	int			(*ndo_fcoe_ddp_done)(struct net_device *dev,
						     u16 xid);
	int			(*ndo_fcoe_ddp_target)(struct net_device *dev,
						       u16 xid,
						       struct scatterlist *sgl,
						       unsigned int sgc);
	int			(*ndo_fcoe_get_hbainfo)(struct net_device *dev,
							struct netdev_fcoe_hbainfo *hbainfo);
#endif

#if IS_ENABLED(CONFIG_LIBFCOE)
#define NETDEV_FCOE_WWNN 0
#define NETDEV_FCOE_WWPN 1
	int			(*ndo_fcoe_get_wwn)(struct net_device *dev,
						    u64 *wwn, int type);
#endif

#ifdef CONFIG_RFS_ACCEL
	int			(*ndo_rx_flow_steer)(struct net_device *dev,
						     const struct sk_buff *skb,
						     u16 rxq_index,
						     u32 flow_id);
#endif
	int			(*ndo_add_slave)(struct net_device *dev,
						 struct net_device *slave_dev,
						 struct netlink_ext_ack *extack);
	int			(*ndo_del_slave)(struct net_device *dev,
						 struct net_device *slave_dev);
	struct net_device*	(*ndo_get_xmit_slave)(struct net_device *dev,
						      struct sk_buff *skb,
						      bool all_slaves);
	struct net_device*	(*ndo_sk_get_lower_dev)(struct net_device *dev,
							struct sock *sk);
	netdev_features_t	(*ndo_fix_features)(struct net_device *dev,
						    netdev_features_t features);
	int			(*ndo_set_features)(struct net_device *dev,
						    netdev_features_t features);
	int			(*ndo_neigh_construct)(struct net_device *dev,
						       struct neighbour *n);
	void			(*ndo_neigh_destroy)(struct net_device *dev,
						     struct neighbour *n);

	int			(*ndo_fdb_add)(struct ndmsg *ndm,
					       struct nlattr *tb[],
					       struct net_device *dev,
					       const unsigned char *addr,
					       u16 vid,
					       u16 flags,
					       struct netlink_ext_ack *extack);
	int			(*ndo_fdb_del)(struct ndmsg *ndm,
					       struct nlattr *tb[],
					       struct net_device *dev,
					       const unsigned char *addr,
					       u16 vid, struct netlink_ext_ack *extack);
	int			(*ndo_fdb_del_bulk)(struct ndmsg *ndm,
						    struct nlattr *tb[],
						    struct net_device *dev,
						    u16 vid,
						    struct netlink_ext_ack *extack);
	int			(*ndo_fdb_dump)(struct sk_buff *skb,
						struct netlink_callback *cb,
						struct net_device *dev,
						struct net_device *filter_dev,
						int *idx);
	int			(*ndo_fdb_get)(struct sk_buff *skb,
					       struct nlattr *tb[],
					       struct net_device *dev,
					       const unsigned char *addr,
					       u16 vid, u32 portid, u32 seq,
					       struct netlink_ext_ack *extack);
	int			(*ndo_bridge_setlink)(struct net_device *dev,
						      struct nlmsghdr *nlh,
						      u16 flags,
						      struct netlink_ext_ack *extack);
	int			(*ndo_bridge_getlink)(struct sk_buff *skb,
						      u32 pid, u32 seq,
						      struct net_device *dev,
						      u32 filter_mask,
						      int nlflags);
	int			(*ndo_bridge_dellink)(struct net_device *dev,
						      struct nlmsghdr *nlh,
						      u16 flags);
	int			(*ndo_change_carrier)(struct net_device *dev,
						      bool new_carrier);
	int			(*ndo_get_phys_port_id)(struct net_device *dev,
							struct netdev_phys_item_id *ppid);
	int			(*ndo_get_port_parent_id)(struct net_device *dev,
							  struct netdev_phys_item_id *ppid);
	int			(*ndo_get_phys_port_name)(struct net_device *dev,
							  char *name, size_t len);
	void*			(*ndo_dfwd_add_station)(struct net_device *pdev,
							struct net_device *dev);
	void			(*ndo_dfwd_del_station)(struct net_device *pdev,
							void *priv);

	int			(*ndo_set_tx_maxrate)(struct net_device *dev,
						      int queue_index,
						      u32 maxrate);
	int			(*ndo_get_iflink)(const struct net_device *dev);
	int			(*ndo_fill_metadata_dst)(struct net_device *dev,
						       struct sk_buff *skb);
	void			(*ndo_set_rx_headroom)(struct net_device *dev,
						       int needed_headroom);
	int			(*ndo_bpf)(struct net_device *dev,
					   struct netdev_bpf *bpf);
	int			(*ndo_xdp_xmit)(struct net_device *dev, int n,
						struct xdp_frame **xdp,
						u32 flags);
	struct net_device *	(*ndo_xdp_get_xmit_slave)(struct net_device *dev,
							  struct xdp_buff *xdp);
	int			(*ndo_xsk_wakeup)(struct net_device *dev,
						  u32 queue_id, u32 flags);
	struct devlink_port *	(*ndo_get_devlink_port)(struct net_device *dev);
	int			(*ndo_tunnel_ctl)(struct net_device *dev,
						  struct ip_tunnel_parm *p, int cmd);
	struct net_device *	(*ndo_get_peer_dev)(struct net_device *dev);
	int                     (*ndo_fill_forward_path)(struct net_device_path_ctx *ctx,
                                                         struct net_device_path *path);
	ktime_t			(*ndo_get_tstamp)(struct net_device *dev,
						  const struct skb_shared_hwtstamps *hwtstamps,
						  bool cycles);
};
```

# 二、软中断处理

- 在`net_dev_init`时，会将`NET_RX_SOFTIRQ`和`NET_TX_SOFTIRQ`注册两个回调函数

```cpp
// net/core/dev.c
/*
 *	Initialize the DEV module. At boot time this walks the device list and
 *	unhooks any devices that fail to initialise (normally hardware not
 *	present) and leaves us with a valid list of present and active devices.
 *
 */

/*
 *       This is called single threaded during boot, so no need
 *       to take the rtnl semaphore.
 */
static int __init net_dev_init(void)
{
    ...
	open_softirq(NET_TX_SOFTIRQ, net_tx_action);
	open_softirq(NET_RX_SOFTIRQ, net_rx_action);
    ...
}
```

## 1. 接收软中断`NET_TX_SOFTIRQ`

- 处理函数

```cpp
static __latent_entropy void net_rx_action(struct softirq_action *h)
{
    ...
	for (;;) {
		struct napi_struct *n;

		skb_defer_free_flush(sd);

		if (list_empty(&list)) {
			if (!sd_has_rps_ipi_waiting(sd) && list_empty(&repoll))
				goto end;
			break;
		}

		n = list_first_entry(&list, struct napi_struct, poll_list);
		budget -= napi_poll(n, &repoll);
        ...
	}
    ...
}
```
