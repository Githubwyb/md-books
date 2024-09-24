---
title: "2. Kernel panic - not syncing: hung_task: blocked tasks"
---

# 一、堆栈信息

```
[930452.890969] INFO: task idsd:31761 blocked for more than 480 seconds.
[930452.891127] oom_reaper: reaped process 15265 ((irewalld)), now anon-rss:0kB, file-rss:0kB, shmem-rss:0kB
[930452.891476]       Tainted: G            E     4.19.181 #6
[930452.892678] "echo 0 > /proc/sys/kernel/hung_task_timeout_secs" disables this message.
[930452.893296] idsd            D    0 31761      1 0x00000080
[930452.893721] Call Trace:
[930452.893934]  __schedule+0x254/0x840
[930452.894217]  schedule+0x28/0x80
[930452.894463]  rwsem_down_read_failed+0x111/0x180
[930452.894981]  ? xfs_file_buffered_aio_read+0x3c/0xe0 [xfs]
[930452.895398]  call_rwsem_down_read_failed+0x14/0x30
[930452.895798]  down_read+0x1c/0x30
[930452.896102]  xfs_ilock+0x82/0x100 [xfs]
[930452.896435]  xfs_file_buffered_aio_read+0x3c/0xe0 [xfs]
[930452.896901]  xfs_file_read_iter+0x6e/0xd0 [xfs]
[930452.897372]  __vfs_read+0x133/0x190
[930452.897651]  vfs_read+0x91/0x140
[930452.897937]  ksys_read+0x57/0xd0
[930452.898194]  do_syscall_64+0x5f/0x1e0
[930452.898454]  ? prepare_exit_to_usermode+0x90/0xc0
[930452.898840]  entry_SYSCALL_64_after_hwframe+0x44/0xa9
[930452.899229] RIP: 0033:0x7f3846598d75
[930452.899517] Code: Bad RIP value.
[930452.899808] RSP: 002b:00007ffe2d885d68 EFLAGS: 00000246 ORIG_RAX: 0000000000000000
[930452.900328] RAX: ffffffffffffffda RBX: 000055d2443adf70 RCX: 00007f3846598d75
[930452.900697] RDX: 0000000000010000 RSI: 00007ffe2d885f60 RDI: 000000000000000d
[930452.901094] RBP: 00007f3846866280 R08: 0000000000000000 R09: 00007f3846869d40
[930452.901514] R10: 000055d244381010 R11: 0000000000000246 R12: 0000000000010000
[930452.902067] R13: 00007ffe2d885f60 R14: 0000000000000d68 R15: 00007f3846865740
[930452.902721] NMI backtrace for cpu 3
[930452.902927] CPU: 3 PID: 55 Comm: khungtaskd Kdump: loaded Tainted: G            E     4.19.181 #6
[930452.903422] Hardware name: Bochs Bochs, BIOS 1.13.0-20201211_142035 04/01/2014
[930452.903886] Call Trace:
[930452.904038]  dump_stack+0x66/0x81
[930452.904246]  nmi_cpu_backtrace.cold.5+0x13/0x4e
[930452.904540]  ? lapic_can_unplug_cpu+0x80/0x80
[930452.904788]  nmi_trigger_cpumask_backtrace+0xde/0xe0
[930452.905048]  watchdog+0x24e/0x320
[930452.905226]  ? hungtask_pm_notify+0x40/0x40
[930452.905459]  kthread+0x112/0x130
[930452.905632]  ? kthread_bind+0x30/0x30
[930452.905829]  ret_from_fork+0x35/0x40
[930452.906104] Sending NMI from CPU 3 to CPUs 0-2,4-7:
[930452.906503] NMI backtrace for cpu 2 skipped: idling at native_safe_halt+0xe/0x10
[930452.906511] NMI backtrace for cpu 6 skipped: idling at native_safe_halt+0xe/0x10
[930452.906518] NMI backtrace for cpu 1
[930452.906519] CPU: 1 PID: 73259 Comm: in:imjournal Kdump: loaded Tainted: G            E     4.19.181 #6
[930452.906519] Hardware name: Bochs Bochs, BIOS 1.13.0-20201211_142035 04/01/2014
[930452.906520] RIP: 0010:syscall_return_via_sysret+0x6c/0x83
[930452.906521] Code: 73 0f 65 48 0f b3 3c 25 d6 17 02 00 48 89 c7 eb 08 48 89 c7 48 0f ba ef 3f 48 81 cf 00 08 00 00 48 81 cf 00 10 00 00 0f 22 df <58> 5f 5c 0f 01 f8 48 0f 07 0f 1f 40 00 66 2e 0f 1f 84 00 00 00 00
[930452.906522] RSP: 0018:fffffe000002efe8 EFLAGS: 00000086
[930452.906523] RAX: 0000000187c50003 RBX: 00007ff248000bd0 RCX: 00007ff2604e7b51
[930452.906524] RDX: 0000000000000241 RSI: 00007ff256881b30 RDI: 8000000187c51803
[930452.906524] RBP: 0000000000000004 R08: 0000000000000000 R09: 0000000000000001
[930452.906525] R10: 00000000000001b6 R11: 0000000000000293 R12: 00007ff25e6f6c87
[930452.906526] R13: 00007ff25e6f6c86 R14: 0000000000000001 R15: 00007ff2544be138
[930452.906526] FS:  00007ff256883700(0000) GS:ffff95f22dc40000(0000) knlGS:0000000000000000
[930452.906527] CS:  0010 DS: 0000 ES: 0000 CR0: 0000000080050033
[930452.906527] CR2: 00007ff2544b0000 CR3: 0000000187c50003 CR4: 00000000000206e0
[930452.906528] DR0: 0000000000000000 DR1: 0000000000000000 DR2: 0000000000000000
[930452.906528] DR3: 0000000000000000 DR6: 00000000fffe0ff0 DR7: 0000000000000400
[930452.906529] Call Trace:
[930452.906529]  <ENTRY_TRAMPOLINE>
[930452.906529]  </ENTRY_TRAMPOLINE>
[930452.906533] NMI backtrace for cpu 0 skipped: idling at native_safe_halt+0xe/0x10
[930452.906544] NMI backtrace for cpu 5
[930452.906545] CPU: 5 PID: 126827 Comm: systemd-journal Kdump: loaded Tainted: G            E     4.19.181 #6
[930452.906546] Hardware name: Bochs Bochs, BIOS 1.13.0-20201211_142035 04/01/2014
[930452.906546] RIP: 0010:0xffffffffc01e4902
[930452.906547] Code: cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc cc <55> 48 89 e5 48 81 ec 00 00 00 00 53 41 55 41 56 41 57 31 c0 45 31
[930452.906548] RSP: 0018:ffffb0d6871dbd88 EFLAGS: 00000286
[930452.906549] RAX: ffffffffc01e4902 RBX: ffff95ef8414cea0 RCX: 000000007fff0000
[930452.906549] RDX: 000000007fff0000 RSI: ffffb0d6819a5038 RDI: ffffb0d6871dbec0
[930452.906549] RBP: 000000007fff0000 R08: 0000000000000000 R09: 0000000000000000
[930452.906550] R10: 0000000000000000 R11: 0000000000000000 R12: ffffb0d6871dbec0
[930452.906550] R13: ffffb0d6871dbe08 R14: 0000000000000000 R15: 0000000000000000
[930452.906551] FS:  00007f3929d18600(0000) GS:ffff95f22dd40000(0000) knlGS:0000000000000000
[930452.906551] CS:  0010 DS: 0000 ES: 0000 CR0: 0000000080050033
[930452.906551] CR2: 00007f3924613000 CR3: 000000013b03a001 CR4: 00000000000206e0
[930452.906552] DR0: 0000000000000000 DR1: 0000000000000000 DR2: 0000000000000000
[930452.906552] DR3: 0000000000000000 DR6: 00000000fffe0ff0 DR7: 0000000000000400
[930452.906552] Call Trace:
[930452.906553]  ? seccomp_run_filters+0x5c/0xb0
[930452.906553]  ? do_filp_open+0xa7/0x100
[930452.906553]  ? __seccomp_filter+0x44/0x4a0
[930452.906554]  ? audit_filter_rules.constprop.14+0x438/0x1100
[930452.906554]  ? __check_object_size+0x162/0x180
[930452.906554]  ? syscall_trace_enter+0x192/0x2b0
[930452.906555]  ? do_syscall_64+0x14d/0x1e0
[930452.906555]  ? async_page_fault+0x8/0x30
[930452.906555]  ? entry_SYSCALL_64_after_hwframe+0x44/0xa9
[930452.906582] NMI backtrace for cpu 7 skipped: idling at native_safe_halt+0xe/0x10
[930452.906636] NMI backtrace for cpu 4 skipped: idling at native_safe_halt+0xe/0x10
[930452.907596] Kernel panic - not syncing: hung_task: blocked tasks
[930452.915969] last invoked oom-killer: gfp_mask=0x600040(GFP_NOFS), nodemask=(null), order=0, oom_score_adj=-1000
[930452.916497] CPU: 3 PID: 55 Comm: khungtaskd Kdump: loaded Tainted: G            E     4.19.181 #6
[930452.916748] last cpuset=/ mems_allowed=0
[930452.917390] Hardware name: Bochs Bochs, BIOS 1.13.0-20201211_142035 04/01/2014
[930452.917391] Call Trace:
[930452.917403]  dump_stack+0x66/0x81
[930452.917409]  panic+0xe7/0x24a
[930452.933168]  watchdog+0x25a/0x320
[930452.933390]  ? hungtask_pm_notify+0x40/0x40
[930452.933649]  kthread+0x112/0x130
[930452.933877]  ? kthread_bind+0x30/0x30
[930452.934136]  ret_from_fork+0x35/0x40
[930452.934372] CPU: 5 PID: 12473 Comm: last Kdump: loaded Tainted: G            E     4.19.181 #6
```

# 二、分析堆栈信息

## 1. 首先正面分析堆栈

```shell
[267625.696626] Kernel panic - not syncing: hung_task: blocked tasks
```

- 这个在网上查原因是由于某个进程卡死超过一定时间，内核有个配置进行宕机处理
- 网上说明的出现问题的都是xfs调用导致，都是由于磁盘问题或代码bug造成死锁而出现
- 本堆栈环境是云平台的虚拟机
