---
title: "files 读取/etc/hosts文件"
---

# gethostbyname

## 源码

- 从`_nss_files_gethostbyname3_r`开始

```cpp
// nss/nss_files/files-hosts.c
enum nss_status
_nss_files_gethostbyname3_r (const char *name, int af, struct hostent *result,
			     char *buffer, size_t buflen, int *errnop,
			     int *herrnop, int32_t *ttlp, char **canonp)
{
  FILE *stream = NULL;
  uintptr_t pad = -(uintptr_t) buffer % __alignof__ (struct hostent_data);
  buffer += pad;
  buflen = buflen > pad ? buflen - pad : 0;

  /* Open file.  */
  enum nss_status status = internal_setent (&stream);

  if (status == NSS_STATUS_SUCCESS)
    {
      while ((status = internal_getent (stream, result, buffer, buflen, errnop,
					herrnop, af))
	     == NSS_STATUS_SUCCESS)
	{
	  LOOKUP_NAME_CASE (h_name, h_aliases)
	}

      if (status == NSS_STATUS_SUCCESS
	  && _res_hconf.flags & HCONF_FLAG_MULTI)
	status = gethostbyname3_multi
	  (stream, name, af, result, buffer, buflen, errnop, herrnop);

      fclose (stream);
    }

  if (canonp && status == NSS_STATUS_SUCCESS)
    *canonp = result->h_name;

  return status;
}
libc_hidden_def (_nss_files_gethostbyname3_r)
```

- `inernal_setent`打开文件`/etc/hosts`

```cpp
// nss/nss_files/files-XXX.c
#define DATAFILE	"/etc/" DATABASE

// nss/nss_files/files-hosts.c
#define DATABASE	"hosts"

// nss/nss_files/files-XXX.c
/* Maintenance of the stream open on the database file.  For getXXent
   operations the stream needs to be held open across calls, the other
   getXXbyYY operations all use their own stream.  */

/* Open database file if not already opened.  */
static enum nss_status
internal_setent (FILE **stream)
{
  enum nss_status status = NSS_STATUS_SUCCESS;

  if (*stream == NULL)
    {
      *stream = __nss_files_fopen (DATAFILE);

      if (*stream == NULL)
	status = errno == EAGAIN ? NSS_STATUS_TRYAGAIN : NSS_STATUS_UNAVAIL;
    }
  else
    rewind (*stream);

  return status;
}
```

- 所以files就是处理`/etc/hosts`文件
