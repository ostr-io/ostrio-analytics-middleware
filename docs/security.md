# Security and proxy behavior

Middleware accepts only `GET {endpoint}/{trackingId}.gif`. Exact pathname matching rejects traversal, extra segments, and other tracking IDs.

Proxy rules:

- Forward only cookie names in `forwardedCookies`. Default: `ot`.
- Forward only response headers in `responseHeaders`.
- Rewrite allowed `Set-Cookie` headers: `Path` becomes the beacon path; `Domain` becomes the configured hostname. Other cookie names are dropped.
- Reject query strings longer than `maxSearchLen` with `204` before opening upstream request.
- Settle upstream errors, client aborts, and timeouts with `204`. Host middleware receives no upstream exception.

`resolveClientIp` trusts `cf-connecting-ip` only when `cf-ray` is also present. This proves header presence, not proxy authenticity. Use custom resolver when origin accepts direct traffic or sits behind known proxy hops.

`serviceOrigin` is operator configuration. It must be an HTTPS origin and is validated at construction. Do not derive it from request input.
