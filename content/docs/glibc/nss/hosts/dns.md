---
title: "dns 根据/etc/resolv.conf发包处理"
---

# gethostbyname

## 源码

- 从`_nss_dns_gethostbyname3_r`开始

```cpp
// resolv/nss_dns/dns-host.c
enum nss_status
_nss_dns_gethostbyname3_r (const char *name, int af, struct hostent *result,
			   char *buffer, size_t buflen, int *errnop,
			   int *h_errnop, int32_t *ttlp, char **canonp)
{
  struct resolv_context *ctx = __resolv_context_get ();
  if (ctx == NULL)
    {
      *errnop = errno;
      *h_errnop = NETDB_INTERNAL;
      return NSS_STATUS_UNAVAIL;
    }
  enum nss_status status = gethostbyname3_context
    (ctx, name, af, result, buffer, buflen, errnop, h_errnop, ttlp, canonp);
  __resolv_context_put (ctx);
  return status;
}
libc_hidden_def (_nss_dns_gethostbyname3_r)
```

### 1. 如何读取`/etc/resolv.conf`

- 获取`struct resolv_context *ctx`

```cpp
// resolv/resolv_context.c
struct resolv_context *
__resolv_context_get (void)
{
  return context_get (false);
}
libc_hidden_def (__resolv_context_get)

// resolv/resolv_context.c
/* Backing function for the __resolv_context_get family of
   functions.  */
static struct resolv_context *
context_get (bool preinit)
{
  if (current != NULL)
    return context_reuse ();

  struct resolv_context *ctx = context_alloc (&_res);
  if (ctx == NULL)
    return NULL;
  if (!maybe_init (ctx, preinit))
    {
      context_free (ctx);
      return NULL;
    }
  return ctx;
}

// resolv/resolv_context.c
/* Initialize *RESP if RES_INIT is not yet set in RESP->options, or if
   res_init in some other thread requested re-initializing.  */
static __attribute__ ((warn_unused_result)) bool
maybe_init (struct resolv_context *ctx, bool preinit)
{
  struct __res_state *resp = ctx->resp;
  if (resp->options & RES_INIT)
    {
      if (resp->options & RES_NORELOAD)
        /* Configuration reloading was explicitly disabled.  */
        return true;

      /* If there is no associated resolv_conf object despite the
         initialization, something modified *ctx->resp.  Do not
         override those changes.  */
      if (ctx->conf != NULL && replicated_configuration_matches (ctx))
        {
          struct resolv_conf *current = __resolv_conf_get_current ();
          if (current == NULL)
            return false;

          /* Check if the configuration changed.  */
          if (current != ctx->conf)
            {
              /* This call will detach the extended resolver state.  */
              if (resp->nscount > 0)
                __res_iclose (resp, true);
              /* Reattach the current configuration.  */
              if (__resolv_conf_attach (ctx->resp, current))
                {
                  __resolv_conf_put (ctx->conf);
                  /* ctx takes ownership, so we do not release current.  */
                  ctx->conf = current;
                }
            }
          else
            /* No change.  Drop the reference count for current.  */
            __resolv_conf_put (current);
        }
      return true;
    }

  assert (ctx->conf == NULL);
  if (preinit)
    {
      if (!resp->retrans)
        resp->retrans = RES_TIMEOUT;
      if (!resp->retry)
        resp->retry = RES_DFLRETRY;
      resp->options = RES_DEFAULT;
      if (!resp->id)
        resp->id = res_randomid ();
    }

  if (__res_vinit (resp, preinit) < 0)
    return false;
  ctx->conf = __resolv_conf_get (ctx->resp);
  return true;
}
```

- 调用`__resolv_conf_get_current`，里面会检测`/etc/resolv.conf`是否改变，改变则重新加载

```cpp
struct resolv_conf *
__resolv_conf_get_current (void)
{
  struct file_change_detection initial;
  // 检测一下/etc/resolv.conf是否更改，结果存到initial中，返回的只是函数调用的成功或失败
  if (!__file_change_detection_for_path (&initial, _PATH_RESCONF))
    return NULL;

  struct resolv_conf_global *global_copy = get_locked_global ();
  if (global_copy == NULL)
    return NULL;
  struct resolv_conf *conf;
  if (global_copy->conf_current != NULL
      && __file_is_unchanged (&initial, &global_copy->file_resolve_conf))
    /* We can reuse the cached configuration object.  */
    conf = global_copy->conf_current;
  else
    {
      /* Parse configuration while holding the lock.  This avoids
         duplicate work.  */
      struct file_change_detection after_load;
      conf = __resolv_conf_load (NULL, &after_load);
      if (conf != NULL)
        {
          if (global_copy->conf_current != NULL)
            conf_decrement (global_copy->conf_current);
          global_copy->conf_current = conf; /* Takes ownership.  */

          /* Update file change detection data, but only if it matches
             the initial measurement.  This avoids an ABA race in case
             /etc/resolv.conf is temporarily replaced while the file
             is read (after the initial measurement), and restored to
             the initial version later.  */
          if (__file_is_unchanged (&initial, &after_load))
            global_copy->file_resolve_conf = after_load;
          else
            /* If there is a discrepancy, trigger a reload during the
               next use.  */
            global_copy->file_resolve_conf.size = -1;
        }
    }

  if (conf != NULL)
    {
      /* Return an additional reference.  */
      assert (conf->__refcount > 0);
      ++conf->__refcount;
      assert (conf->__refcount > 0);
    }
  put_locked_global (global_copy);
  return conf;
}
```

- 重新加载会调用`__resolv_conf_load`加载配置打开`/etc/resolv.conf`

```cpp
// resolv/resolv.h
#ifndef _PATH_RESCONF
#define _PATH_RESCONF        "/etc/resolv.conf"
#endif

// resolv/res_init.c
struct resolv_conf *
__resolv_conf_load (struct __res_state *preinit,
                    struct file_change_detection *change)
{
  /* Ensure that /etc/hosts.conf has been loaded (once).  */
  _res_hconf_init ();

  FILE *fp = fopen (_PATH_RESCONF, "rce");
  if (fp == NULL)
    switch (errno)
      {
      case EACCES:
      case EISDIR:
      case ELOOP:
      case ENOENT:
      case ENOTDIR:
      case EPERM:
        /* Ignore these errors.  They are persistent errors caused
           by file system contents.  */
        break;
      default:
        /* Other errors refer to resource allocation problems and
           need to be handled by the application.  */
        return NULL;
      }

  struct resolv_conf_parser parser;
  resolv_conf_parser_init (&parser, preinit);

  struct resolv_conf *conf = NULL;
  bool ok = res_vinit_1 (fp, &parser);
  if (ok && change != NULL)
    /* Update the file change information if the configuration was
       loaded successfully.  */
    ok = __file_change_detection_for_fp (change, fp);

  if (ok)
    {
      parser.template.nameserver_list
        = nameserver_list_begin (&parser.nameserver_list);
      parser.template.nameserver_list_size
        = nameserver_list_size (&parser.nameserver_list);
      parser.template.search_list = search_list_begin (&parser.search_list);
      parser.template.search_list_size
        = search_list_size (&parser.search_list);
      parser.template.sort_list = sort_list_begin (&parser.sort_list);
      parser.template.sort_list_size = sort_list_size (&parser.sort_list);
      conf = __resolv_conf_allocate (&parser.template);
    }
  resolv_conf_parser_free (&parser);

  if (fp != NULL)
    {
      int saved_errno = errno;
      fclose (fp);
      __set_errno (saved_errno);
    }

  return conf;
}
```

#### 处理`/etc/resolv.conf`

- 格式化一下看

```cpp
// resolv/res_init.c
/* Internal helper function for __res_vinit, to aid with resource
   deallocation and error handling.  Return true on success, false on
   failure.  */
static bool res_vinit_1(FILE *fp, struct resolv_conf_parser *parser) {
    char *cp;
    size_t buffer_size = 0;
    bool haveenv = false;

    /* Allow user to override the local domain definition.  */
    if ((cp = getenv("LOCALDOMAIN")) != NULL) {
        /* The code below splits the string in place.  */
        cp = __strdup(cp);
        if (cp == NULL) return false;
        free(parser->search_list_store);
        parser->search_list_store = cp;
        haveenv = true;

        /* The string will be truncated as needed below.  */
        search_list_add(&parser->search_list, cp);

        /* Set search list to be blank-separated strings from rest of
           env value.  Permits users of LOCALDOMAIN to still have a
           search list, and anyone to set the one that they want to use
           as an individual (even more important now that the rfc1535
           stuff restricts searches).  */
        for (bool in_name = true; *cp != '\0'; cp++) {
            if (*cp == '\n') {
                *cp = '\0';
                break;
            } else if (*cp == ' ' || *cp == '\t') {
                *cp = '\0';
                in_name = false;
            } else if (!in_name) {
                search_list_add(&parser->search_list, cp);
                in_name = true;
            }
        }
    }

#define MATCH(line, name) \
    (!strncmp((line), name, sizeof(name) - 1) && ((line)[sizeof(name) - 1] == ' ' || (line)[sizeof(name) - 1] == '\t'))

    if (fp != NULL) {
        /* No threads use this stream.  */
        __fsetlocking(fp, FSETLOCKING_BYCALLER);
        /* Read the config file.  */
        while (true) {
            {
                ssize_t ret = __getline(&parser->buffer, &buffer_size, fp);
                if (ret <= 0) {
                    if (_IO_ferror_unlocked(fp))
                        return false;
                    else
                        break;
                }
            }

            /* Skip comments.  */
            if (*parser->buffer == ';' || *parser->buffer == '#') continue;
            /* Read default domain name.  */
            if (MATCH(parser->buffer, "domain")) {
                if (haveenv) /* LOCALDOMAIN overrides the configuration file.  */
                    continue;
                cp = parser->buffer + sizeof("domain") - 1;
                while (*cp == ' ' || *cp == '\t') cp++;
                if ((*cp == '\0') || (*cp == '\n')) continue;

                cp = __strdup(cp);
                if (cp == NULL) return false;
                free(parser->search_list_store);
                parser->search_list_store = cp;
                search_list_clear(&parser->search_list);
                search_list_add(&parser->search_list, cp);
                /* Replace trailing whitespace.  */
                if ((cp = strpbrk(cp, " \t\n")) != NULL) *cp = '\0';
                continue;
            }
            /* Set search list.  */
            if (MATCH(parser->buffer, "search")) {
                if (haveenv) /* LOCALDOMAIN overrides the configuration file.  */
                    continue;
                cp = parser->buffer + sizeof("search") - 1;
                while (*cp == ' ' || *cp == '\t') cp++;
                if ((*cp == '\0') || (*cp == '\n')) continue;

                {
                    char *p = strchr(cp, '\n');
                    if (p != NULL) *p = '\0';
                }
                cp = __strdup(cp);
                if (cp == NULL) return false;
                free(parser->search_list_store);
                parser->search_list_store = cp;

                /* The string is truncated below.  */
                search_list_clear(&parser->search_list);
                search_list_add(&parser->search_list, cp);

                /* Set search list to be blank-separated strings on rest
                   of line.  */
                for (bool in_name = true; *cp != '\0'; cp++) {
                    if (*cp == ' ' || *cp == '\t') {
                        *cp = '\0';
                        in_name = false;
                    } else if (!in_name) {
                        search_list_add(&parser->search_list, cp);
                        in_name = true;
                    }
                }
                continue;
            }
            /* Read nameservers to query.  */
            if (MATCH(parser->buffer, "nameserver")) {
                struct in_addr a;

                cp = parser->buffer + sizeof("nameserver") - 1;
                while (*cp == ' ' || *cp == '\t') cp++;

                /* Ignore trailing contents on the name server line.  */
                {
                    char *el;
                    if ((el = strpbrk(cp, " \t\n")) != NULL) *el = '\0';
                }

                struct sockaddr *sa;
                if ((*cp != '\0') && (*cp != '\n') && __inet_aton_exact(cp, &a)) {
                    sa = allocate_address_v4(a, NAMESERVER_PORT);
                    if (sa == NULL) return false;
                } else {
                    struct in6_addr a6;
                    char *el;
                    if ((el = strchr(cp, SCOPE_DELIMITER)) != NULL) *el = '\0';
                    if ((*cp != '\0') && (__inet_pton(AF_INET6, cp, &a6) > 0)) {
                        struct sockaddr_in6 *sa6;

                        sa6 = malloc(sizeof(*sa6));
                        if (sa6 == NULL) return false;

                        sa6->sin6_family = AF_INET6;
                        sa6->sin6_port = htons(NAMESERVER_PORT);
                        sa6->sin6_flowinfo = 0;
                        sa6->sin6_addr = a6;

                        sa6->sin6_scope_id = 0;
                        if (__glibc_likely(el != NULL))
                            /* Ignore errors, for backwards
                               compatibility.  */
                            __inet6_scopeid_pton(&a6, el + 1, &sa6->sin6_scope_id);
                        sa = (struct sockaddr *)sa6;
                    } else
                        /* IPv6 address parse failure.  */
                        sa = NULL;
                }
                if (sa != NULL) {
                    const struct sockaddr **p = nameserver_list_emplace(&parser->nameserver_list);
                    if (p != NULL)
                        *p = sa;
                    else {
                        free(sa);
                        return false;
                    }
                }
                continue;
            }
            if (MATCH(parser->buffer, "sortlist")) {
                struct in_addr a;

                cp = parser->buffer + sizeof("sortlist") - 1;
                while (true) {
                    while (*cp == ' ' || *cp == '\t') cp++;
                    if (*cp == '\0' || *cp == '\n' || *cp == ';') break;
                    char *net = cp;
                    while (*cp && !is_sort_mask(*cp) && *cp != ';' && isascii(*cp) && !isspace(*cp)) cp++;
                    char separator = *cp;
                    *cp = 0;
                    struct resolv_sortlist_entry e;
                    if (__inet_aton_exact(net, &a)) {
                        e.addr = a;
                        if (is_sort_mask(separator)) {
                            *cp++ = separator;
                            net = cp;
                            while (*cp && *cp != ';' && isascii(*cp) && !isspace(*cp)) cp++;
                            separator = *cp;
                            *cp = 0;
                            if (__inet_aton_exact(net, &a))
                                e.mask = a.s_addr;
                            else
                                e.mask = net_mask(e.addr);
                        } else
                            e.mask = net_mask(e.addr);
                        sort_list_add(&parser->sort_list, e);
                    }
                    *cp = separator;
                }
                continue;
            }
            if (MATCH(parser->buffer, "options")) {
                res_setoptions(parser, parser->buffer + sizeof("options") - 1);
                continue;
            }
        }
    }
    if (__glibc_unlikely(nameserver_list_size(&parser->nameserver_list) == 0)) {
        const struct sockaddr **p = nameserver_list_emplace(&parser->nameserver_list);
        if (p == NULL) return false;
        *p = allocate_address_v4(__inet_makeaddr(IN_LOOPBACKNET, 1), NAMESERVER_PORT);
        if (*p == NULL) return false;
    }

    if (search_list_size(&parser->search_list) == 0) {
        char *domain;
        if (!domain_from_hostname(&domain)) return false;
        if (domain != NULL) {
            free(parser->search_list_store);
            parser->search_list_store = domain;
            search_list_add(&parser->search_list, domain);
        }
    }

    if ((cp = getenv("RES_OPTIONS")) != NULL) res_setoptions(parser, cp);

    if (nameserver_list_has_failed(&parser->nameserver_list) || search_list_has_failed(&parser->search_list) ||
        sort_list_has_failed(&parser->sort_list)) {
        __set_errno(ENOMEM);
        return false;
    }

    return true;
}
```

### 2. 如何发包

- 调用`gethostbyname3_context`，格式化了一下，之前的缩进太难看懂

```cpp
// resolv/nss_dns/dns-host.c
static enum nss_status gethostbyname3_context(struct resolv_context *ctx, const char *name, int af,
                                              struct hostent *result, char *buffer, size_t buflen, int *errnop,
                                              int *h_errnop, int32_t *ttlp, char **canonp) {
    union {
        querybuf *buf;
        u_char *ptr;
    } host_buffer;
    querybuf *orig_host_buffer;
    char tmp[NS_MAXDNAME];
    int size, type, n;
    const char *cp;
    int map = 0;
    int olderr = errno;
    enum nss_status status;

    switch (af) {
        case AF_INET:
            size = INADDRSZ;
            type = T_A;
            break;
        case AF_INET6:
            size = IN6ADDRSZ;
            type = T_AAAA;
            break;
        default:
            *h_errnop = NO_DATA;
            *errnop = EAFNOSUPPORT;
            return NSS_STATUS_UNAVAIL;
    }

    result->h_addrtype = af;
    result->h_length = size;

    /*
     * if there aren't any dots, it could be a user-level alias.
     * this is also done in res_query() since we are not the only
     * function that looks up host names.
     */
    if (strchr(name, '.') == NULL && (cp = __res_context_hostalias(ctx, name, tmp, sizeof(tmp))) != NULL) name = cp;

    host_buffer.buf = orig_host_buffer = (querybuf *)alloca(1024);

    // 这里发起dns请求
    n = __res_context_search(ctx, name, C_IN, type, host_buffer.buf->buf, 1024, &host_buffer.ptr, NULL, NULL, NULL,
                             NULL);
    if (n < 0) {
        switch (errno) {
            case ESRCH:
                status = NSS_STATUS_TRYAGAIN;
                h_errno = TRY_AGAIN;
                break;
            /* System has run out of file descriptors.  */
            case EMFILE:
            case ENFILE:
                h_errno = NETDB_INTERNAL;
                /* Fall through.  */
            case ECONNREFUSED:
            case ETIMEDOUT:
                status = NSS_STATUS_UNAVAIL;
                break;
            default:
                status = NSS_STATUS_NOTFOUND;
                break;
        }
        *h_errnop = h_errno;
        if (h_errno == TRY_AGAIN)
            *errnop = EAGAIN;
        else
            __set_errno(olderr);

        /* If we are looking for an IPv6 address and mapping is enabled
       by having the RES_USE_INET6 bit in _res.options set, we try
       another lookup.  */
        if (af == AF_INET6 && res_use_inet6())
            n = __res_context_search(ctx, name, C_IN, T_A, host_buffer.buf->buf,
                                     host_buffer.buf != orig_host_buffer ? MAXPACKET : 1024, &host_buffer.ptr, NULL,
                                     NULL, NULL, NULL);

        if (n < 0) {
            if (host_buffer.buf != orig_host_buffer) free(host_buffer.buf);
            return status;
        }

        map = 1;

        result->h_addrtype = AF_INET;
        result->h_length = INADDRSZ;
    }

    // 处理一下dns响应结果
    status =
        getanswer_r(ctx, host_buffer.buf, n, name, type, result, buffer, buflen, errnop, h_errnop, map, ttlp, canonp);
    if (host_buffer.buf != orig_host_buffer) free(host_buffer.buf);
    return status;
}
```

- 到`__res_context_search`进行处理发送dns请求

```cpp
// resolv/res_query.c
/* Formulate a normal query, send, and retrieve answer in supplied
   buffer.  Return the size of the response on success, -1 on error.
   If enabled, implement search rules until answer or unrecoverable
   failure is detected.  Error code, if any, is left in h_errno.  */
int
__res_context_search (struct resolv_context *ctx,
		      const char *name, int class, int type,
		      unsigned char *answer, int anslen,
		      unsigned char **answerp, unsigned char **answerp2,
		      int *nanswerp2, int *resplen2, int *answerp2_malloced)
{
	struct __res_state *statp = ctx->resp;
	const char *cp;
	UHEADER *hp = (UHEADER *) answer;
	char tmp[NS_MAXDNAME];
	u_int dots;
	int trailing_dot, ret, saved_herrno;
	int got_nodata = 0, got_servfail = 0, root_on_list = 0;
	int tried_as_is = 0;
	int searched = 0;

	__set_errno (0);
	RES_SET_H_ERRNO(statp, HOST_NOT_FOUND);  /* True if we never query. */

	dots = 0;
	for (cp = name; *cp != '\0'; cp++)
		dots += (*cp == '.');
	trailing_dot = 0;
	if (cp > name && *--cp == '.')
		trailing_dot++;

	/* If there aren't any dots, it could be a user-level alias. */
	if (!dots && (cp = __res_context_hostalias
		      (ctx, name, tmp, sizeof tmp))!= NULL)
	  return __res_context_query (ctx, cp, class, type, answer,
				      anslen, answerp, answerp2,
				      nanswerp2, resplen2, answerp2_malloced);

	/*
	 * If there are enough dots in the name, let's just give it a
	 * try 'as is'. The threshold can be set with the "ndots" option.
	 * Also, query 'as is', if there is a trailing dot in the name.
	 */
	saved_herrno = -1;
	if (dots >= statp->ndots || trailing_dot) {
		ret = __res_context_querydomain (ctx, name, NULL, class, type,
						 answer, anslen, answerp,
						 answerp2, nanswerp2, resplen2,
						 answerp2_malloced);
		if (ret > 0 || trailing_dot
		    /* If the second response is valid then we use that.  */
		    || (ret == 0 && resplen2 != NULL && *resplen2 > 0))
			return (ret);
		saved_herrno = h_errno;
		tried_as_is++;
		if (answerp && *answerp != answer) {
			answer = *answerp;
			anslen = MAXPACKET;
		}
		if (answerp2 && *answerp2_malloced)
		  {
		    free (*answerp2);
		    *answerp2 = NULL;
		    *nanswerp2 = 0;
		    *answerp2_malloced = 0;
		  }
	}

	/*
	 * We do at least one level of search if
	 *	- there is no dot and RES_DEFNAME is set, or
	 *	- there is at least one dot, there is no trailing dot,
	 *	  and RES_DNSRCH is set.
	 */
	if ((!dots && (statp->options & RES_DEFNAMES) != 0) ||
	    (dots && !trailing_dot && (statp->options & RES_DNSRCH) != 0)) {
		int done = 0;

		for (size_t domain_index = 0; !done; ++domain_index) {
			const char *dname = __resolv_context_search_list
			  (ctx, domain_index);
			if (dname == NULL)
			  break;
			searched = 1;

			/* __res_context_querydoman concatenates name
			   with dname with a "." in between.  If we
			   pass it in dname the "." we got from the
			   configured default search path, we'll end
			   up with "name..", which won't resolve.
			   OTOH, passing it "" will result in "name.",
			   which has the intended effect for both
			   possible representations of the root
			   domain.  */
			if (dname[0] == '.')
				dname++;
			if (dname[0] == '\0')
				root_on_list++;

			ret = __res_context_querydomain
			  (ctx, name, dname, class, type,
			   answer, anslen, answerp, answerp2, nanswerp2,
			   resplen2, answerp2_malloced);
			if (ret > 0 || (ret == 0 && resplen2 != NULL
					&& *resplen2 > 0))
				return (ret);

			if (answerp && *answerp != answer) {
				answer = *answerp;
				anslen = MAXPACKET;
			}
			if (answerp2 && *answerp2_malloced)
			  {
			    free (*answerp2);
			    *answerp2 = NULL;
			    *nanswerp2 = 0;
			    *answerp2_malloced = 0;
			  }

			/*
			 * If no server present, give up.
			 * If name isn't found in this domain,
			 * keep trying higher domains in the search list
			 * (if that's enabled).
			 * On a NO_DATA error, keep trying, otherwise
			 * a wildcard entry of another type could keep us
			 * from finding this entry higher in the domain.
			 * If we get some other error (negative answer or
			 * server failure), then stop searching up,
			 * but try the input name below in case it's
			 * fully-qualified.
			 */
			if (errno == ECONNREFUSED) {
				RES_SET_H_ERRNO(statp, TRY_AGAIN);
				return (-1);
			}

			switch (statp->res_h_errno) {
			case NO_DATA:
				got_nodata++;
				/* FALLTHROUGH */
			case HOST_NOT_FOUND:
				/* keep trying */
				break;
			case TRY_AGAIN:
				if (hp->rcode == SERVFAIL) {
					/* try next search element, if any */
					got_servfail++;
					break;
				}
				/* FALLTHROUGH */
			default:
				/* anything else implies that we're done */
				done++;
			}

			/* if we got here for some reason other than DNSRCH,
			 * we only wanted one iteration of the loop, so stop.
			 */
			if ((statp->options & RES_DNSRCH) == 0)
				done++;
		}
	}

	/*
	 * If the query has not already been tried as is then try it
	 * unless RES_NOTLDQUERY is set and there were no dots.
	 */
	if ((dots || !searched || (statp->options & RES_NOTLDQUERY) == 0)
	    && !(tried_as_is || root_on_list)) {
		ret = __res_context_querydomain
		  (ctx, name, NULL, class, type,
		   answer, anslen, answerp, answerp2, nanswerp2,
		   resplen2, answerp2_malloced);
		if (ret > 0 || (ret == 0 && resplen2 != NULL
				&& *resplen2 > 0))
			return (ret);
	}

	/* if we got here, we didn't satisfy the search.
	 * if we did an initial full query, return that query's H_ERRNO
	 * (note that we wouldn't be here if that query had succeeded).
	 * else if we ever got a nodata, send that back as the reason.
	 * else send back meaningless H_ERRNO, that being the one from
	 * the last DNSRCH we did.
	 */
	if (answerp2 && *answerp2_malloced)
	  {
	    free (*answerp2);
	    *answerp2 = NULL;
	    *nanswerp2 = 0;
	    *answerp2_malloced = 0;
	  }
	if (saved_herrno != -1)
		RES_SET_H_ERRNO(statp, saved_herrno);
	else if (got_nodata)
		RES_SET_H_ERRNO(statp, NO_DATA);
	else if (got_servfail)
		RES_SET_H_ERRNO(statp, TRY_AGAIN);
	return (-1);
}
libc_hidden_def (__res_context_search)
```

- 从`__res_context_querydomain`也会调用到`__res_context_query`
- 里面就是判断了一下最大域名大小不超过1025

```cpp
// resolv/arpa/nameser_compat.h
#define MAXDNAME	NS_MAXDNAME

// resolv/arpa/nameser.h
#define NS_MAXDNAME	1025	/*%< maximum domain name */

// resolv/res_query.c
/*  Perform a call on res_query on the concatenation of name and
    domain.  */
static int
__res_context_querydomain (struct resolv_context *ctx,
			   const char *name, const char *domain,
			   int class, int type,
			   unsigned char *answer, int anslen,
			   unsigned char **answerp, unsigned char **answerp2,
			   int *nanswerp2, int *resplen2,
			   int *answerp2_malloced)
{
	struct __res_state *statp = ctx->resp;
	char nbuf[MAXDNAME];
	const char *longname = nbuf;
	size_t n, d;

	if (domain == NULL) {
		n = strlen(name);

		/* Decrement N prior to checking it against MAXDNAME
		   so that we detect a wrap to SIZE_MAX and return
		   a reasonable error.  */
		n--;
		if (n >= MAXDNAME - 1) {
			RES_SET_H_ERRNO(statp, NO_RECOVERY);
			return (-1);
		}
		longname = name;
	} else {
		n = strlen(name);
		d = strlen(domain);
        // 判断一下是否超过最长域名大小
		if (n + d + 1 >= MAXDNAME) {
			RES_SET_H_ERRNO(statp, NO_RECOVERY);
			return (-1);
		}
		char *p = __stpcpy (nbuf, name);
		*p++ = '.';
		strcpy (p, domain);
	}
	return __res_context_query (ctx, longname, class, type, answer,
				    anslen, answerp, answerp2, nanswerp2,
				    resplen2, answerp2_malloced);
}
```

- `__res_context_query`发起dns请求

```cpp
// resolv/res_query.c
/* Formulate a normal query, send, and await answer.  Returned answer
   is placed in supplied buffer ANSWER.  Perform preliminary check of
   answer, returning success only if no error is indicated and the
   answer count is nonzero.  Return the size of the response on
   success, -1 on error.  Error number is left in h_errno.

   Caller must parse answer and determine whether it answers the
   question.  */
int
__res_context_query (struct resolv_context *ctx, const char *name,
		     int class, int type,
		     unsigned char *answer, int anslen,
		     unsigned char **answerp, unsigned char **answerp2,
		     int *nanswerp2, int *resplen2, int *answerp2_malloced)
{
	struct __res_state *statp = ctx->resp;
	UHEADER *hp = (UHEADER *) answer;
	UHEADER *hp2;
	int n, use_malloc = 0;

	size_t bufsize = (type == T_QUERY_A_AND_AAAA ? 2 : 1) * QUERYSIZE;
	u_char *buf = alloca (bufsize);
	u_char *query1 = buf;
	int nquery1 = -1;
	u_char *query2 = NULL;
	int nquery2 = 0;

 again:
    // 构造dns请求包
	hp->rcode = NOERROR;	/* default */

	if (type == T_QUERY_A_AND_AAAA)
	  {
	    n = __res_context_mkquery (ctx, QUERY, name, class, T_A, NULL,
				       query1, bufsize);
	    if (n > 0)
	      {
		if ((statp->options & (RES_USE_EDNS0|RES_USE_DNSSEC)) != 0)
		  {
		    /* Use RESOLV_EDNS_BUFFER_SIZE because the receive
		       buffer can be reallocated.  */
		    n = __res_nopt (ctx, n, query1, bufsize,
				    RESOLV_EDNS_BUFFER_SIZE);
		    if (n < 0)
		      goto unspec_nomem;
		  }

		nquery1 = n;
		/* Align the buffer.  */
		int npad = ((nquery1 + __alignof__ (HEADER) - 1)
			    & ~(__alignof__ (HEADER) - 1)) - nquery1;
		if (n > bufsize - npad)
		  {
		    n = -1;
		    goto unspec_nomem;
		  }
		int nused = n + npad;
		query2 = buf + nused;
		n = __res_context_mkquery (ctx, QUERY, name, class, T_AAAA,
					   NULL, query2, bufsize - nused);
		if (n > 0
		    && (statp->options & (RES_USE_EDNS0|RES_USE_DNSSEC)) != 0)
		  /* Use RESOLV_EDNS_BUFFER_SIZE because the receive
		     buffer can be reallocated.  */
		  n = __res_nopt (ctx, n, query2, bufsize,
				  RESOLV_EDNS_BUFFER_SIZE);
		nquery2 = n;
	      }

	  unspec_nomem:;
	  }
	else
	  {
	    n = __res_context_mkquery (ctx, QUERY, name, class, type, NULL,
				       query1, bufsize);

	    if (n > 0
		&& (statp->options & (RES_USE_EDNS0|RES_USE_DNSSEC)) != 0)
	      {
		/* Use RESOLV_EDNS_BUFFER_SIZE if the receive buffer
		   can be reallocated.  */
		size_t advertise;
		if (answerp == NULL)
		  advertise = anslen;
		else
		  advertise = RESOLV_EDNS_BUFFER_SIZE;
		n = __res_nopt (ctx, n, query1, bufsize, advertise);
	      }

	    nquery1 = n;
	  }

	if (__glibc_unlikely (n <= 0) && !use_malloc) {
		/* Retry just in case res_nmkquery failed because of too
		   short buffer.  Shouldn't happen.  */
		bufsize = (type == T_QUERY_A_AND_AAAA ? 2 : 1) * MAXPACKET;
		buf = malloc (bufsize);
		if (buf != NULL) {
			query1 = buf;
			use_malloc = 1;
			goto again;
		}
	}
	if (__glibc_unlikely (n <= 0))       {
		RES_SET_H_ERRNO(statp, NO_RECOVERY);
		if (use_malloc)
			free (buf);
		return (n);
	}

	/* Suppress AAAA lookups if required.  __res_handle_no_aaaa
	   checks RES_NOAAAA first, so avoids parsing the
	   just-generated query packet in most cases.  nss_dns avoids
	   using T_QUERY_A_AND_AAAA in RES_NOAAAA mode, so there is no
	   need to handle it here.  */
	if (type == T_AAAA && __res_handle_no_aaaa (ctx, query1, nquery1,
						    answer, anslen, &n))
	  /* There must be no second query for AAAA queries.  The code
	     below is still needed to translate NODATA responses.  */
	  assert (query2 == NULL);
	else
	  {
	    assert (answerp == NULL || (void *) *answerp == (void *) answer);
        // 发送dns请求
	    n = __res_context_send (ctx, query1, nquery1, query2, nquery2,
				    answer, anslen,
				    answerp, answerp2, nanswerp2, resplen2,
				    answerp2_malloced);
	  }

    // 处理dns响应
	if (use_malloc)
		free (buf);
	if (n < 0) {
		RES_SET_H_ERRNO(statp, TRY_AGAIN);
		return (n);
	}

	if (answerp != NULL)
	  /* __res_context_send might have reallocated the buffer.  */
	  hp = (UHEADER *) *answerp;

	/* We simplify the following tests by assigning HP to HP2 or
	   vice versa.  It is easy to verify that this is the same as
	   ignoring all tests of HP or HP2.  */
	if (answerp2 == NULL || *resplen2 < (int) sizeof (HEADER))
	  {
	    hp2 = hp;
	  }
	else
	  {
	    hp2 = (UHEADER *) *answerp2;
	    if (n < (int) sizeof (HEADER))
	      {
	        hp = hp2;
	      }
	  }

	/* Make sure both hp and hp2 are defined */
	assert((hp != NULL) && (hp2 != NULL));

	if ((hp->rcode != NOERROR || ntohs(hp->ancount) == 0)
	    && (hp2->rcode != NOERROR || ntohs(hp2->ancount) == 0)) {
		switch (hp->rcode == NOERROR ? hp2->rcode : hp->rcode) {
		case NXDOMAIN:
			if ((hp->rcode == NOERROR && ntohs (hp->ancount) != 0)
			    || (hp2->rcode == NOERROR
				&& ntohs (hp2->ancount) != 0))
				goto success;
			RES_SET_H_ERRNO(statp, HOST_NOT_FOUND);
			break;
		case SERVFAIL:
			RES_SET_H_ERRNO(statp, TRY_AGAIN);
			break;
		case NOERROR:
			if (ntohs (hp->ancount) != 0
			    || ntohs (hp2->ancount) != 0)
				goto success;
			RES_SET_H_ERRNO(statp, NO_DATA);
			break;
		case FORMERR:
		case NOTIMP:
			/* Servers must not reply to AAAA queries with
			   NOTIMP etc but some of them do.  */
			if ((hp->rcode == NOERROR && ntohs (hp->ancount) != 0)
			    || (hp2->rcode == NOERROR
				&& ntohs (hp2->ancount) != 0))
				goto success;
			/* FALLTHROUGH */
		case REFUSED:
		default:
			RES_SET_H_ERRNO(statp, NO_RECOVERY);
			break;
		}
		return (-1);
	}
 success:
	return (n);
}
libc_hidden_def (__res_context_query)
```

- `__res_context_send`发送dns请求包

```cpp
// resolv/res_send.c
int
__res_context_send (struct resolv_context *ctx,
		    const unsigned char *buf, int buflen,
		    const unsigned char *buf2, int buflen2,
		    unsigned char *ans, int anssiz,
		    unsigned char **ansp, unsigned char **ansp2,
		    int *nansp2, int *resplen2, int *ansp2_malloced)
{
	struct __res_state *statp = ctx->resp;
	int gotsomewhere, terrno, try, v_circuit, resplen;
	/* On some architectures send_vc is inlined and the compiler might emit
	   a warning indicating 'resplen' may be used uninitialized.  Note that
	   the warning belongs to resplen in send_vc which is used as return
	   value!  There the maybe-uninitialized warning is already ignored as
	   it is a false-positive - see comment in send_vc.
	   Here the variable n is set to the return value of send_vc.
	   See below.  */
	DIAG_PUSH_NEEDS_COMMENT;
	DIAG_IGNORE_NEEDS_COMMENT (9, "-Wmaybe-uninitialized");
	int n;
	DIAG_POP_NEEDS_COMMENT;

	if (statp->nscount == 0) {
		__set_errno (ESRCH);
		return (-1);
	}

	if (anssiz < (buf2 == NULL ? 1 : 2) * HFIXEDSZ) {
		__set_errno (EINVAL);
		return (-1);
	}

	v_circuit = ((statp->options & RES_USEVC)
		     || buflen > PACKETSZ
		     || buflen2 > PACKETSZ);
	gotsomewhere = 0;
	terrno = ETIMEDOUT;

	/*
	 * If the ns_addr_list in the resolver context has changed, then
	 * invalidate our cached copy and the associated timing data.
	 */
	if (EXT(statp).nscount != 0) {
		int needclose = 0;

		if (EXT(statp).nscount != statp->nscount)
			needclose++;
		else
			for (unsigned int ns = 0; ns < statp->nscount; ns++) {
				if (statp->nsaddr_list[ns].sin_family != 0
				    && !sock_eq((struct sockaddr_in6 *)
						&statp->nsaddr_list[ns],
						EXT(statp).nsaddrs[ns]))
				{
					needclose++;
					break;
				}
			}
		if (needclose) {
			__res_iclose(statp, false);
			EXT(statp).nscount = 0;
		}
	}

	/*
	 * Maybe initialize our private copy of the ns_addr_list.
	 */
	if (EXT(statp).nscount == 0) {
		for (unsigned int ns = 0; ns < statp->nscount; ns++) {
			EXT(statp).nssocks[ns] = -1;
			if (statp->nsaddr_list[ns].sin_family == 0)
				continue;
			if (EXT(statp).nsaddrs[ns] == NULL)
				EXT(statp).nsaddrs[ns] =
				    malloc(sizeof (struct sockaddr_in6));
			if (EXT(statp).nsaddrs[ns] != NULL)
				memset (mempcpy(EXT(statp).nsaddrs[ns],
						&statp->nsaddr_list[ns],
						sizeof (struct sockaddr_in)),
					'\0',
					sizeof (struct sockaddr_in6)
					- sizeof (struct sockaddr_in));
			else
				return -1;
		}
		EXT(statp).nscount = statp->nscount;
	}

	/* Name server index offset.  Used to implement
	   RES_ROTATE.  */
	unsigned int ns_offset = nameserver_offset (statp);

	/*
	 * Send request, RETRY times, or until successful.
	 */
    // 发送请求，重试到成功或超出重试次数为止
    // 根据ns为索引，一个一个尝试，超时就尝试下一个
	for (try = 0; try < statp->retry; try++) {
	    for (unsigned ns_shift = 0; ns_shift < statp->nscount; ns_shift++)
	    {
		/* The actual name server index.  This implements
		   RES_ROTATE.  */
		unsigned int ns = ns_shift + ns_offset;
		if (ns >= statp->nscount)
			ns -= statp->nscount;

	    same_ns:
		if (__glibc_unlikely (v_circuit))       {
            // tcpdns，内部会创建socket放到statp->_vcsock中
			/* Use VC; at most one attempt per server. */
			try = statp->retry;
			n = send_vc(statp, buf, buflen, buf2, buflen2,
				    &ans, &anssiz, &terrno,
				    ns, ansp, ansp2, nansp2, resplen2,
				    ansp2_malloced);
			if (n < 0)
				return (-1);
			/* See comment at the declaration of n.  */
			DIAG_PUSH_NEEDS_COMMENT;
			DIAG_IGNORE_NEEDS_COMMENT (9, "-Wmaybe-uninitialized");
			if (n == 0 && (buf2 == NULL || *resplen2 == 0))
				goto next_ns;
			DIAG_POP_NEEDS_COMMENT;
		} else {
            // udpdns，内部会创建socket放到EXT(statp).nssocks中
			/* Use datagrams. */
			n = send_dg(statp, buf, buflen, buf2, buflen2,
				    &ans, &anssiz, &terrno,
				    ns, &v_circuit, &gotsomewhere, ansp,
				    ansp2, nansp2, resplen2, ansp2_malloced);
			if (n < 0)
				return (-1);
			if (n == 0 && (buf2 == NULL || *resplen2 == 0))
				goto next_ns;
			if (v_circuit)
			  // XXX Check whether both requests failed or
			  // XXX whether one has been answered successfully
				goto same_ns;
		}

		resplen = n;

		/* See comment at the declaration of n.  Note: resplen = n;  */
		DIAG_PUSH_NEEDS_COMMENT;
		DIAG_IGNORE_NEEDS_COMMENT (9, "-Wmaybe-uninitialized");
		/* Mask the AD bit in both responses unless it is
		   marked trusted.  */
		if (resplen > HFIXEDSZ)
		  {
		    if (ansp != NULL)
		      mask_ad_bit (ctx, *ansp);
		    else
		      mask_ad_bit (ctx, ans);
		  }
		DIAG_POP_NEEDS_COMMENT;
		if (resplen2 != NULL && *resplen2 > HFIXEDSZ)
		  mask_ad_bit (ctx, *ansp2);

		/*
		 * If we have temporarily opened a virtual circuit,
		 * or if we haven't been asked to keep a socket open,
		 * close the socket.
		 */
		if ((v_circuit && (statp->options & RES_USEVC) == 0) ||
		    (statp->options & RES_STAYOPEN) == 0) {
			__res_iclose(statp, false);
		}
		return (resplen);
 next_ns: ;
	   } /*foreach ns*/
	} /*foreach retry*/
	__res_iclose(statp, false);
	if (!v_circuit) {
		if (!gotsomewhere)
			__set_errno (ECONNREFUSED);	/* no nameservers found */
		else
			__set_errno (ETIMEDOUT);	/* no answer obtained */
	} else
		__set_errno (terrno);
	return (-1);
}
libc_hidden_def (__res_context_send)
```
