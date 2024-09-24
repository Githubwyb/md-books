---
title: "早期日志输出"
---

# 一、前言

linux启动过程中，还没有初始化好文件系统等，日志输出不到文件。使用printk则需要整个框架初始化好，包括锁和buffer等。这时需要一个能在最早期进行输出的方式，每个架构的cpu都实现了此方式，直接输出到芯片，通过芯片输出到外部。芯片只要上电就可以进行输出，输出方式分为串口和vga。

# 二、串口输出

串口输出就是直接将字符输出到`0x3f8`即可在串口上收到字符串数据，同时可以通过串口输入拿到数据。

```cpp
// arch/x86/kernel/early_printk.c
/* Serial functions loosely based on a similar package from Klaus P. Gerlicher */

static unsigned long early_serial_base = 0x3f8;  /* ttyS0 */

#define XMTRDY          0x20

#define DLAB		0x80

#define TXR             0       /*  Transmit register (WRITE) */
#define RXR             0       /*  Receive register  (READ)  */
#define IER             1       /*  Interrupt Enable          */
#define IIR             2       /*  Interrupt ID              */
#define FCR             2       /*  FIFO control              */
#define LCR             3       /*  Line control              */
#define MCR             4       /*  Modem control             */
#define LSR             5       /*  Line Status               */
#define MSR             6       /*  Modem Status              */
#define DLL             0       /*  Divisor Latch Low         */
#define DLH             1       /*  Divisor latch High        */

static unsigned int io_serial_in(unsigned long addr, int offset)
{
	return inb(addr + offset);
}

static void io_serial_out(unsigned long addr, int offset, int value)
{
	outb(value, addr + offset);
}

static unsigned int (*serial_in)(unsigned long addr, int offset) = io_serial_in;
static void (*serial_out)(unsigned long addr, int offset, int value) = io_serial_out;

static int early_serial_putc(unsigned char ch)
{
	unsigned timeout = 0xffff;

	while ((serial_in(early_serial_base, LSR) & XMTRDY) == 0 && --timeout)
		cpu_relax();
	serial_out(early_serial_base, TXR, ch);
	return timeout ? 0 : -1;
}

static void early_serial_write(struct console *con, const char *s, unsigned n)
{
	while (*s && n-- > 0) {
		if (*s == '\n')
			early_serial_putc('\r');
		early_serial_putc(*s);
		s++;
	}
}
```

串口输出就是使用`early_serial_write`即可，对应的内核里面使用是注册到一个`early_console`里面，通过下面代码进行注册

```cpp
// arch/x86/kernel/early_printk.c
static struct console early_serial_console = {
	.name =		"earlyser",
	.write =	early_serial_write,
	.flags =	CON_PRINTBUFFER,
	.index =	-1,
};

static void early_console_register(struct console *con, int keep_early)
{
	if (con->index != -1) {
		printk(KERN_CRIT "ERROR: earlyprintk= %s already used\n",
		       con->name);
		return;
	}
	early_console = con;
	if (keep_early)
		early_console->flags &= ~CON_BOOT;
	else
		early_console->flags |= CON_BOOT;
	register_console(early_console);
}

static int __init setup_early_printk(char *buf)
{
	int keep;

	if (!buf)
		return 0;

	if (early_console)
		return 0;

	keep = (strstr(buf, "keep") != NULL);

	while (*buf != '\0') {
		if (!strncmp(buf, "serial", 6)) {
			buf += 6;
			early_serial_init(buf);
			early_console_register(&early_serial_console, keep);
			if (!strncmp(buf, ",ttyS", 5))
				buf += 5;
		}
		if (!strncmp(buf, "ttyS", 4)) {
			early_serial_init(buf + 4);
			early_console_register(&early_serial_console, keep);
		}
#ifdef CONFIG_PCI
		if (!strncmp(buf, "pciserial", 9)) {
			early_pci_serial_init(buf + 9);
			early_console_register(&early_serial_console, keep);
			buf += 9; /* Keep from match the above "serial" */
		}
#endif
		if (!strncmp(buf, "vga", 3) &&
		    boot_params.screen_info.orig_video_isVGA == 1) {
			max_xpos = boot_params.screen_info.orig_video_cols;
			max_ypos = boot_params.screen_info.orig_video_lines;
			current_ypos = boot_params.screen_info.orig_y;
			early_console_register(&early_vga_console, keep);
		}
#ifdef CONFIG_EARLY_PRINTK_DBGP
		if (!strncmp(buf, "dbgp", 4) && !early_dbgp_init(buf + 4))
			early_console_register(&early_dbgp_console, keep);
#endif
#ifdef CONFIG_HVC_XEN
		if (!strncmp(buf, "xen", 3))
			early_console_register(&xenboot_console, keep);
#endif
#ifdef CONFIG_EARLY_PRINTK_USB_XDBC
		if (!strncmp(buf, "xdbc", 4))
			early_xdbc_parse_parameter(buf + 4, keep);
#endif

		buf++;
	}
	return 0;
}

early_param("earlyprintk", setup_early_printk);
```

设置波特率和硬件初始化代码

```cpp
// arch/x86/kernel/early_printk.c
static __init void early_serial_hw_init(unsigned divisor)
{
	unsigned char c;

	serial_out(early_serial_base, LCR, 0x3);	/* 8n1 */
	serial_out(early_serial_base, IER, 0);	/* no interrupt */
	serial_out(early_serial_base, FCR, 0);	/* no fifo */
	serial_out(early_serial_base, MCR, 0x3);	/* DTR + RTS */

	c = serial_in(early_serial_base, LCR);
	serial_out(early_serial_base, LCR, c | DLAB);
	serial_out(early_serial_base, DLL, divisor & 0xff);
	serial_out(early_serial_base, DLH, (divisor >> 8) & 0xff);
	serial_out(early_serial_base, LCR, c & ~DLAB);
}

#define DEFAULT_BAUD 9600

static __init void early_serial_init(char *s)
{
	unsigned divisor;
	unsigned long baud = DEFAULT_BAUD;
	char *e;

	if (*s == ',')
		++s;

	if (*s) {
		unsigned port;
		if (!strncmp(s, "0x", 2)) {
			early_serial_base = simple_strtoul(s, &e, 16);
		} else {
			static const int __initconst bases[] = { 0x3f8, 0x2f8 };

			if (!strncmp(s, "ttyS", 4))
				s += 4;
			port = simple_strtoul(s, &e, 10);
			if (port > 1 || s == e)
				port = 0;
			early_serial_base = bases[port];
		}
		s += strcspn(s, ",");
		if (*s == ',')
			s++;
	}

	if (*s) {
		baud = simple_strtoull(s, &e, 0);

		if (baud == 0 || s == e)
			baud = DEFAULT_BAUD;
	}

	/* Convert from baud to divisor value */
	divisor = 115200 / baud;

	/* These will always be IO based ports */
	serial_in = io_serial_in;
	serial_out = io_serial_out;

	/* Set up the HW */
	early_serial_hw_init(divisor);
}
```
