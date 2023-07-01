---
title: "Certificate Verify"
---

# 一、构造请求

```cpp
// ssl/statem/statem_lib.c
int tls_construct_cert_verify(SSL *s, WPACKET *pkt)
{
    EVP_PKEY *pkey = NULL;
    const EVP_MD *md = NULL;
    EVP_MD_CTX *mctx = NULL;
    EVP_PKEY_CTX *pctx = NULL;
    size_t hdatalen = 0, siglen = 0;
    void *hdata;
    unsigned char *sig = NULL;
    unsigned char tls13tbs[TLS13_TBS_PREAMBLE_SIZE + EVP_MAX_MD_SIZE];
    const SIGALG_LOOKUP *lu = s->s3.tmp.sigalg;

    if (lu == NULL || s->s3.tmp.cert == NULL) {
        SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_INTERNAL_ERROR);
        goto err;
    }
    // 从证书中取私钥用于签名
    pkey = s->s3.tmp.cert->privatekey;

    if (pkey == NULL || !tls1_lookup_md(s->ctx, lu, &md)) {
        SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_INTERNAL_ERROR);
        goto err;
    }

    mctx = EVP_MD_CTX_new();
    if (mctx == NULL) {
        SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_MALLOC_FAILURE);
        goto err;
    }

    /* Get the data to be signed */
    // 获取要用于签名的数据
    if (!get_cert_verify_tbs_data(s, tls13tbs, &hdata, &hdatalen)) {
        /* SSLfatal() already called */
        goto err;
    }

    if (SSL_USE_SIGALGS(s) && !WPACKET_put_bytes_u16(pkt, lu->sigalg)) {
        SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_INTERNAL_ERROR);
        goto err;
    }

    // 做签名的准备
    if (EVP_DigestSignInit_ex(mctx, &pctx,
                              md == NULL ? NULL : EVP_MD_get0_name(md),
                              s->ctx->libctx, s->ctx->propq, pkey,
                              NULL) <= 0) {
        SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_EVP_LIB);
        goto err;
    }

    if (lu->sig == EVP_PKEY_RSA_PSS) {
        if (EVP_PKEY_CTX_set_rsa_padding(pctx, RSA_PKCS1_PSS_PADDING) <= 0
            || EVP_PKEY_CTX_set_rsa_pss_saltlen(pctx,
                                                RSA_PSS_SALTLEN_DIGEST) <= 0) {
            SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_EVP_LIB);
            goto err;
        }
    }

    // 根据版本做不同的签名信息
    if (s->version == SSL3_VERSION) {
        /*
         * Here we use EVP_DigestSignUpdate followed by EVP_DigestSignFinal
         * in order to add the EVP_CTRL_SSL3_MASTER_SECRET call between them.
         */
        if (EVP_DigestSignUpdate(mctx, hdata, hdatalen) <= 0
            || EVP_MD_CTX_ctrl(mctx, EVP_CTRL_SSL3_MASTER_SECRET,
                               (int)s->session->master_key_length,
                               s->session->master_key) <= 0
            || EVP_DigestSignFinal(mctx, NULL, &siglen) <= 0) {

            SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_EVP_LIB);
            goto err;
        }
        sig = OPENSSL_malloc(siglen);
        if (sig == NULL
                || EVP_DigestSignFinal(mctx, sig, &siglen) <= 0) {
            SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_EVP_LIB);
            goto err;
        }
    } else {
        /*
         * Here we *must* use EVP_DigestSign() because Ed25519/Ed448 does not
         * support streaming via EVP_DigestSignUpdate/EVP_DigestSignFinal
         */
        if (EVP_DigestSign(mctx, NULL, &siglen, hdata, hdatalen) <= 0) {
            SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_EVP_LIB);
            goto err;
        }
        sig = OPENSSL_malloc(siglen);
        if (sig == NULL
                || EVP_DigestSign(mctx, sig, &siglen, hdata, hdatalen) <= 0) {
            SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_EVP_LIB);
            goto err;
        }
    }

#ifndef OPENSSL_NO_GOST
    {
        int pktype = lu->sig;

        if (pktype == NID_id_GostR3410_2001
            || pktype == NID_id_GostR3410_2012_256
            || pktype == NID_id_GostR3410_2012_512)
            BUF_reverse(sig, NULL, siglen);
    }
#endif

    // 把签名信息放到包里面
    if (!WPACKET_sub_memcpy_u16(pkt, sig, siglen)) {
        SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_INTERNAL_ERROR);
        goto err;
    }

    /* Digest cached records and discard handshake buffer */
    if (!ssl3_digest_cached_records(s, 0)) {
        /* SSLfatal() already called */
        goto err;
    }

    OPENSSL_free(sig);
    EVP_MD_CTX_free(mctx);
    return 1;
 err:
    OPENSSL_free(sig);
    EVP_MD_CTX_free(mctx);
    return 0;
}
```

- 获取`certificate verify`的用于签名的数据

```cpp
// ssl/statem/statem_lib.c
/*
 * Size of the to-be-signed TLS13 data, without the hash size itself:
 * 64 bytes of value 32, 33 context bytes, 1 byte separator
 */
#define TLS13_TBS_START_SIZE            64
#define TLS13_TBS_PREAMBLE_SIZE         (TLS13_TBS_START_SIZE + 33 + 1)

static int get_cert_verify_tbs_data(SSL *s, unsigned char *tls13tbs,
                                    void **hdata, size_t *hdatalen)
{
    /* ASCII: "TLS 1.3, server CertificateVerify", in hex for EBCDIC compatibility */
    static const char servercontext[] = "\x54\x4c\x53\x20\x31\x2e\x33\x2c\x20\x73\x65\x72"
        "\x76\x65\x72\x20\x43\x65\x72\x74\x69\x66\x69\x63\x61\x74\x65\x56\x65\x72\x69\x66\x79";
    /* ASCII: "TLS 1.3, client CertificateVerify", in hex for EBCDIC compatibility */
    static const char clientcontext[] = "\x54\x4c\x53\x20\x31\x2e\x33\x2c\x20\x63\x6c\x69"
        "\x65\x6e\x74\x20\x43\x65\x72\x74\x69\x66\x69\x63\x61\x74\x65\x56\x65\x72\x69\x66\x79";

    if (SSL_IS_TLS13(s)) {
        size_t hashlen;

        /* Set the first 64 bytes of to-be-signed data to octet 32 */
        memset(tls13tbs, 32, TLS13_TBS_START_SIZE);
        /* This copies the 33 bytes of context plus the 0 separator byte */
        if (s->statem.hand_state == TLS_ST_CR_CERT_VRFY
                 || s->statem.hand_state == TLS_ST_SW_CERT_VRFY)
            strcpy((char *)tls13tbs + TLS13_TBS_START_SIZE, servercontext);
        else
            strcpy((char *)tls13tbs + TLS13_TBS_START_SIZE, clientcontext);

        /*
         * If we're currently reading then we need to use the saved handshake
         * hash value. We can't use the current handshake hash state because
         * that includes the CertVerify itself.
         */
        if (s->statem.hand_state == TLS_ST_CR_CERT_VRFY
                || s->statem.hand_state == TLS_ST_SR_CERT_VRFY) {
            memcpy(tls13tbs + TLS13_TBS_PREAMBLE_SIZE, s->cert_verify_hash,
                   s->cert_verify_hash_len);
            hashlen = s->cert_verify_hash_len;
        } else if (!ssl_handshake_hash(s, tls13tbs + TLS13_TBS_PREAMBLE_SIZE,
                                       EVP_MAX_MD_SIZE, &hashlen)) {
            /* SSLfatal() already called */
            return 0;
        }

        *hdata = tls13tbs;
        *hdatalen = TLS13_TBS_PREAMBLE_SIZE + hashlen;
    } else {
        size_t retlen;
        long retlen_l;

        // tls1.3之前使用握手缓冲区的数据作为要用于签名的数据
        retlen = retlen_l = BIO_get_mem_data(s->s3.handshake_buffer, hdata);
        if (retlen_l <= 0) {
            SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_INTERNAL_ERROR);
            return 0;
        }
        *hdatalen = retlen;
    }

    return 1;
}
```
