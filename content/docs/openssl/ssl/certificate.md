---
title: "Certificate"
---

# 一、构造请求

## 1. 构造服务端证书

```cpp

```

## 2. 构造客户端证书

```cpp
/* 到这一步的堆栈信息
libssl.so.3!tls_construct_client_certificate(SSL * s, WPACKET * pkt) (/ssl/statem/statem_clnt.c:3504)
libssl.so.3!write_state_machine(SSL * s) (/ssl/statem/statem.c:855)
libssl.so.3!state_machine(SSL * s, int server) (/ssl/statem/statem.c:451)
libssl.so.3!ossl_statem_connect(SSL * s) (/ssl/statem/statem.c:265)
libssl.so.3!ssl3_write_bytes(SSL * s, int type, const void * buf_, size_t len, size_t * written) (/ssl/record/rec_layer_s3.c:398)
libssl.so.3!ssl3_write(SSL * s, const void * buf, size_t len, size_t * written) (/ssl/s3_lib.c:4449)
libssl.so.3!ssl_write_internal(SSL * s, const void * buf, size_t num, size_t * written) (/ssl/ssl_lib.c:2062)
libssl.so.3!SSL_write(SSL * s, const void * buf, int num) (/ssl/ssl_lib.c:2140)
s_client_main(int argc, char ** argv) (/apps/s_client.c:2841)
do_cmd(struct lhash_st_FUNCTION * prog, int argc, char ** argv) (/apps/openssl.c:418)
main(int argc, char ** argv) (/apps/openssl.c:298)
 */
// ssl/statem/statem_clnt.c
int tls_construct_client_certificate(SSL *s, WPACKET *pkt)
{
    if (SSL_IS_TLS13(s)) {
        if (s->pha_context == NULL) {
            /* no context available, add 0-length context */
            if (!WPACKET_put_bytes_u8(pkt, 0)) {
                SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_INTERNAL_ERROR);
                return 0;
            }
        } else if (!WPACKET_sub_memcpy_u8(pkt, s->pha_context, s->pha_context_len)) {
            SSLfatal(s, SSL_AD_INTERNAL_ERROR, ERR_R_INTERNAL_ERROR);
            return 0;
        }
    }
    if (!ssl3_output_cert_chain(s, pkt,
                                (s->s3.tmp.cert_req == 2) ? NULL
                                                           : s->cert->key)) {
        /* SSLfatal() already called */
        return 0;
    }

    if (SSL_IS_TLS13(s)
            && SSL_IS_FIRST_HANDSHAKE(s)
            && (!s->method->ssl3_enc->change_cipher_state(s,
                    SSL3_CC_HANDSHAKE | SSL3_CHANGE_CIPHER_CLIENT_WRITE))) {
        /*
         * This is a fatal error, which leaves enc_write_ctx in an inconsistent
         * state and thus ssl3_send_alert may crash.
         */
        SSLfatal(s, SSL_AD_NO_ALERT, SSL_R_CANNOT_CHANGE_CIPHER);
        return 0;
    }

    return 1;
}
```

# 二、处理请求

## 1. 客户端收到服务端的Certificate

### 1.1. 证书完整性校验

```cpp
/*
libcrypto.so.3!internal_verify(X509_STORE_CTX * ctx) (crypto/x509/x509_vfy.c:1823)
libcrypto.so.3!verify_chain(X509_STORE_CTX * ctx) (crypto/x509/x509_vfy.c:229)
libcrypto.so.3!X509_verify_cert(X509_STORE_CTX * ctx) (crypto/x509/x509_vfy.c:295)
libssl.so.3!ssl_verify_cert_chain(SSL * s, struct stack_st_X509 * sk) (ssl/ssl_cert.c:446)
libssl.so.3!tls_post_process_server_certificate(SSL * s, WORK_STATE wst) (ssl/statem/statem_clnt.c:1870)
libssl.so.3!ossl_statem_client_post_process_message(SSL * s, WORK_STATE wst) (ssl/statem/statem_clnt.c:1085)
libssl.so.3!read_state_machine(SSL * s) (ssl/statem/statem.c:675)
libssl.so.3!state_machine(SSL * s, int server) (ssl/statem/statem.c:442)
libssl.so.3!ossl_statem_connect(SSL * s) (ssl/statem/statem.c:265)
libssl.so.3!ssl3_write_bytes(SSL * s, int type, const void * buf_, size_t len, size_t * written) (ssl/record/rec_layer_s3.c:398)
libssl.so.3!ssl3_write(SSL * s, const void * buf, size_t len, size_t * written) (ssl/s3_lib.c:4449)
libssl.so.3!ssl_write_internal(SSL * s, const void * buf, size_t num, size_t * written) (ssl/ssl_lib.c:2062)
libssl.so.3!SSL_write(SSL * s, const void * buf, int num) (ssl/ssl_lib.c:2140)
s_client_main(int argc, char ** argv) (apps/s_client.c:2841)
do_cmd(struct lhash_st_FUNCTION * prog, int argc, char ** argv) (apps/openssl.c:418)
main(int argc, char ** argv) (apps/openssl.c:298)
 */
/*
 * Verify the issuer signatures and cert times of ctx->chain.
 * Sadly, returns 0 also on internal error.
 */
static int internal_verify(X509_STORE_CTX *ctx)
{
    int n = sk_X509_num(ctx->chain) - 1;
    X509 *xi = sk_X509_value(ctx->chain, n);
    X509 *xs = xi;

    ctx->error_depth = n;
    if (ctx->bare_ta_signed) {
        /*
         * With DANE-verified bare public key TA signatures,
         * on the top certificate we check only the timestamps.
         * We report the issuer as NULL because all we have is a bare key.
         */
        xi = NULL;
    } else if (ossl_x509_likely_issued(xi, xi) != X509_V_OK
               /* exceptional case: last cert in the chain is not self-issued */
               && ((ctx->param->flags & X509_V_FLAG_PARTIAL_CHAIN) == 0)) {
        if (n > 0) {
            n--;
            ctx->error_depth = n;
            xs = sk_X509_value(ctx->chain, n);
        } else {
            CB_FAIL_IF(1, ctx, xi, 0,
                       X509_V_ERR_UNABLE_TO_VERIFY_LEAF_SIGNATURE);
        }
        /*
         * The below code will certainly not do a
         * self-signature check on xi because it is not self-issued.
         */
    }

    /*
     * Do not clear error (by ctx->error = X509_V_OK), it must be "sticky",
     * only the user's callback is allowed to reset errors (at its own peril).
     */
    while (n >= 0) {
        /*-
         * For each iteration of this loop:
         * n is the subject depth
         * xs is the subject cert, for which the signature is to be checked
         * xi is NULL for DANE-verified bare public key TA signatures
         *       else the supposed issuer cert containing the public key to use
         * Initially xs == xi if the last cert in the chain is self-issued.
         */
        /*
         * Do signature check for self-signed certificates only if explicitly
         * asked for because it does not add any security and just wastes time.
         */
        if (xi != NULL
            && (xs != xi
                || ((ctx->param->flags & X509_V_FLAG_CHECK_SS_SIGNATURE) != 0
                    && (xi->ex_flags & EXFLAG_SS) != 0))) {
            EVP_PKEY *pkey;
            /*
             * If the issuer's public key is not available or its key usage
             * does not support issuing the subject cert, report the issuer
             * cert and its depth (rather than n, the depth of the subject).
             */
            int issuer_depth = n + (xs == xi ? 0 : 1);
            /*
             * According to https://tools.ietf.org/html/rfc5280#section-6.1.4
             * step (n) we must check any given key usage extension in a CA cert
             * when preparing the verification of a certificate issued by it.
             * According to https://tools.ietf.org/html/rfc5280#section-4.2.1.3
             * we must not verify a certificate signature if the key usage of
             * the CA certificate that issued the certificate prohibits signing.
             * In case the 'issuing' certificate is the last in the chain and is
             * not a CA certificate but a 'self-issued' end-entity cert (i.e.,
             * xs == xi && !(xi->ex_flags & EXFLAG_CA)) RFC 5280 does not apply
             * (see https://tools.ietf.org/html/rfc6818#section-2) and thus
             * we are free to ignore any key usage restrictions on such certs.
             */
            int ret = xs == xi && (xi->ex_flags & EXFLAG_CA) == 0
                ? X509_V_OK : ossl_x509_signing_allowed(xi, xs);

            CB_FAIL_IF(ret != X509_V_OK, ctx, xi, issuer_depth, ret);
            // 获取公钥
            if ((pkey = X509_get0_pubkey(xi)) == NULL) {
                CB_FAIL_IF(1, ctx, xi, issuer_depth,
                           X509_V_ERR_UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY);
            } else {
                // 对证书的签名信息使用公钥做完整性校验
                CB_FAIL_IF(X509_verify(xs, pkey) <= 0,
                           ctx, xs, n, X509_V_ERR_CERT_SIGNATURE_FAILURE);
            }
        }

        /* In addition to RFC 5280 requirements do also for trust anchor cert */
        /* Calls verify callback as needed */
        if (!ossl_x509_check_cert_time(ctx, xs, n))
            return 0;

        /*
         * Signal success at this depth.  However, the previous error (if any)
         * is retained.
         */
        ctx->current_issuer = xi;
        ctx->current_cert = xs;
        ctx->error_depth = n;
        if (!ctx->verify_cb(1, ctx))
            return 0;

        if (--n >= 0) {
            xi = xs;
            xs = sk_X509_value(ctx->chain, n);
        }
    }
    return 1;
}
```
