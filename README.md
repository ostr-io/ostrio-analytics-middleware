# ostrio-analytics-middleware

First-party [Connect](https://github.com/senchajs/connect)-compatible middleware that proxies [ostr.io](https://ostr.io/) web analytics GIF beacons through your app origin. Cookies and paths stay on your domain; upstream traffic goes to `analytics.ostr.io`.

- **Repository:** [github.com/ostr-io/ostrio-analytics-middleware](https://github.com/ostr-io/ostrio-analytics-middleware)
- **Analytics platform:** [ostr.io](https://ostr.io/)

## Install

```bash
npm install ostrio-analytics-middleware
```

For browser tracking, also install the peer dependency:

```bash
npm install ostrio-analytics
```

Requires Node.js **18+** (CI tests Node 20 / 22 / 24 and Bun).

## Server usage

### Express / Connect

```js
import express from 'express';
import { OstrioAnalyticsMiddleware } from 'ostrio-analytics-middleware';

const analytics = new OstrioAnalyticsMiddleware({
  trackingId: '72Dymb73P94vgPYeB', // 17-character ostr.io tracking id
  endpoint: '/service/__a',        // mount path, no trailing slash
  hostname: 'example.com'            // public hostname for cookie Domain rewrite
});

const app = express();
app.use(analytics.middleware());
```

Any Connect-compatible stack works the same way: call `analytics.middleware()` early in the chain so beacon requests are intercepted before your routes.

### Meteor `WebApp.connectHandlers`

```js
import { WebApp } from 'meteor/webapp';
import { OstrioAnalyticsMiddleware } from 'ostrio-analytics-middleware';

const analytics = new OstrioAnalyticsMiddleware({
  trackingId: Meteor.settings.public.ostrio.trackingId,
  endpoint: '/service/__a',
  hostname: new URL(Meteor.absoluteUrl()).hostname
});

WebApp.connectHandlers.use(analytics.middleware());
```

Register before other handlers so unmatched requests still reach the rest of your stack.

### Manual `handle(req, res)`

When you cannot use Connect middleware (custom HTTP server, selective routing):

```js
import { createServer } from 'node:http';
import { OstrioAnalyticsMiddleware } from 'ostrio-analytics-middleware';

const analytics = new OstrioAnalyticsMiddleware({ /* config */ });

createServer((req, res) => {
  if (analytics.handle(req, res) !== false) {
    return; // beacon handled
  }
  // ...your normal request handling
}).listen(3000);
```

`handle` returns `false` when the request is **not** a beacon (wrong method, path, etc.) — continue your pipeline. Returns `void` when the response was written.

## Client usage (`createTracker`)

Import from the `./client` subpath (re-exports `ostrio-analytics` types).
Meteor 2.x ignores `package.json` `exports`; root `client.js` / `client.cjs` shims keep this import resolvable.

```js
import { createTracker } from 'ostrio-analytics-middleware/client';

const tracker = createTracker({
  trackingId: '72Dymb73P94vgPYeB',
  endpoint: '/service/__a' // must match server endpoint
});

// Wire pageviews to your router (example: FlowRouter)
FlowRouter.triggers.enter({
  enter() {
    Tracker.afterFlush(() => tracker.pv());
  }
});
```

`createTracker` presets:

| Option | Default |
|--------|---------|
| `serviceUrl` | `{endpoint}/` (trailing slash added if missing) |
| `transport` | `fetch` |
| `auto` | `false` |

All other [`ostrio-analytics`](https://www.npmjs.com/package/ostrio-analytics) options pass through.

## Configuration

### Required

| Field | Description |
|-------|-------------|
| `trackingId` | ostr.io tracking id (exactly 17 characters) |
| `endpoint` | Beacon mount path without trailing slash, e.g. `/service/__a` |
| `hostname` | Public hostname used for `Set-Cookie` Domain rewrite |

Beacons are matched at `GET {endpoint}/{trackingId}.gif`.

### Optional

| Field | Default | Description |
|-------|---------|-------------|
| `serviceOrigin` | `https://analytics.ostr.io` | Upstream analytics origin |
| `defaultReferer` | `https://{hostname}/` | Referer sent when the browser omits one |
| `forwardedCookies` | `['ot']` | Outbound cookie names allowlist |
| `responseHeaders` | `content-type`, `cache-control`, `expires`, `pragma` | Upstream response headers allowlist |
| `upstreamTimeoutMs` | `3072` | Upstream socket timeout |
| `wallTimeoutMs` | `4000` | Total handler wall-clock timeout |
| `maxSearchLen` | `4096` | Max query string length; longer → `204` without upstream |
| `resolveClientIp` | see below | Client IP forwarded to ostr.io |

Invalid config (bad `trackingId` length, empty `endpoint`/`hostname`) throws at construction time.

## Security notes

The proxy is designed for a hardened first-party beacon path:

1. **Exact path match** — only `GET` requests whose pathname equals `{endpoint}/{trackingId}.gif`. Traversal, extra segments, or wrong tracking id are not proxied.
2. **Cookie allowlist** — only configured cookie names are forwarded upstream; `Set-Cookie` responses are filtered and rewritten to your `endpoint` path and `hostname` domain.
3. **Response header allowlist** — arbitrary upstream headers (e.g. `Location`) are not passed through.
4. **Query cap** — oversized query strings get `204` without contacting upstream.
5. **Timeouts** — upstream failures settle with `204`; errors do not propagate into your app.

### Cloudflare client IP

The default `resolveClientIp` uses `cf-connecting-ip` **only when** `cf-ray` is also present; otherwise it falls back to `socket.remoteAddress`.

**Important:** treat Cloudflare IP headers as trustworthy only when your origin is **not** reachable except through Cloudflare (or you verify the connecting peer). If clients can hit your server directly, they can spoof `cf-connecting-ip`. Provide a custom `resolveClientIp` when you need stricter trust (known proxy hops, private network, etc.).

## Package exports

| Import | Purpose |
|--------|---------|
| `ostrio-analytics-middleware` | `OstrioAnalyticsMiddleware`, config types |
| `ostrio-analytics-middleware/client` | `createTracker`, `OstrioWebAnalytics`, client types |

Dual **ESM** and **CJS** builds with TypeScript declarations.

## License

BSD-3-Clause — see [LICENSE](LICENSE).
