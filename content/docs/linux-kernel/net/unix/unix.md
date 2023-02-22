# 一、socket创建

- 定义unix的操作集，当socket调用`pf->create`会调用到`unix_create`

```cpp
// net/unix/af_unix.c
static const struct net_proto_family unix_family_ops = {
	.family = PF_UNIX,
	.create = unix_create,
	.owner	= THIS_MODULE,
};

// net/unix/af_unix.c
static int unix_create(struct net *net, struct socket *sock, int protocol,
		       int kern)
{
	struct sock *sk;

	if (protocol && protocol != PF_UNIX)
		return -EPROTONOSUPPORT;

	sock->state = SS_UNCONNECTED;

	switch (sock->type) {
	case SOCK_STREAM:
		sock->ops = &unix_stream_ops;
		break;
		/*
		 *	Believe it or not BSD has AF_UNIX, SOCK_RAW though
		 *	nothing uses it.
		 */
	case SOCK_RAW:
		sock->type = SOCK_DGRAM;
		fallthrough;
	case SOCK_DGRAM:
		sock->ops = &unix_dgram_ops;
		break;
	case SOCK_SEQPACKET:
		sock->ops = &unix_seqpacket_ops;
		break;
	default:
		return -ESOCKTNOSUPPORT;
	}

	sk = unix_create1(net, sock, kern, sock->type);
	if (IS_ERR(sk))
		return PTR_ERR(sk);

	return 0;
}
```
