# @ostrio/analytics-middleware

First-party [Connect](https://github.com/senchajs/connect)-compatible middleware that proxies [ostr.io](https://ostr.io/) web analytics GIF beacons through your app origin. Cookies and paths stay on your domain; upstream traffic goes to `analytics.ostr.io`.

- **npm:** [@ostrio/analytics-middleware](https://www.npmjs.com/package/@ostrio/analytics-middleware)
- **Repository:** [github.com/ostr-io/ostrio-analytics-middleware](https://github.com/ostr-io/ostrio-analytics-middleware)
- **Analytics platform:** [ostr.io](https://ostr.io/)

## Why first-party tracking?

Third-party beacons (`analytics.ostr.io` loaded from the page) set cookies on the analytics host. Browsers treat those as third-party: Safari ITP, Firefox ETP, and Chrome’s third-party cookie cutoff drop or partition them. Ad blockers also list known analytics hosts.

This middleware serves the GIF from **your origin** (`GET {endpoint}/{trackingId}.gif`). The browser sees a first-party request.

- **Session cookie survives.** `Set-Cookie` is rewritten to your `hostname` and scoped to the beacon path, so Safari/Firefox/Chrome keep the visitor id.
- **Fewer blocked hits.** The request URL is your site, not `analytics.ostr.io`, so host-based blocker lists miss it.
- **Cookie is not on every page request.** Path is the beacon only, not `/`.
- **IP and Referer stay accurate.** The server forwards `X-Forwarded-For` / `X-Connecting-IP` and Referer. The tracker does not depend on the browser talking to a third-party host.
- **Controller boundary.** Collection happens on your origin; ostr.io receives the proxied beacon. That matches a first-party analytics setup for GDPR/CCPA docs.

Without the proxy, `ostrio-analytics` still works as a third-party tracker. Use this package when cookie durability and blocker resistance matter.

## Install

```bash
npm install @ostrio/analytics-middleware
```

For browser tracking, also install optional peer dependency:

```bash
npm install ostrio-analytics
```

Requires Node.js **18+** (CI tests Node 20 / 22 / 24 and Bun).

AI skill:

```bash
npx skills add ostr-io/ostrio-analytics-middleware -g --skill ostrio-analytics-middleware
```

## Server usage

### Express / Connect

```js
import express from 'express';
import { OstrioAnalyticsMiddleware } from '@ostrio/analytics-middleware';

const analytics = new OstrioAnalyticsMiddleware({
  trackingId: '72Dymb73P94vgPYeB', // 17-character URL-safe ostr.io tracking id
  endpoint: '/service/__a',        // mount path, no trailing slash
  hostname: 'example.com'            // public hostname for cookie Domain rewrite
});

const app = express();
app.use(analytics.middleware());
```

Any Connect-compatible stack works the same way: call `analytics.middleware()` early in the chain so beacon requests are intercepted before your routes.

Meteor.js: [docs/meteor.md](https://github.com/ostr-io/ostrio-analytics-middleware/blob/master/docs/meteor.md).

### Manual `handle(req, res)`

When you cannot use Connect middleware (custom HTTP server, selective routing):

```js
import { createServer } from 'node:http';
import { OstrioAnalyticsMiddleware } from '@ostrio/analytics-middleware';

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

```js
import { createTracker } from '@ostrio/analytics-middleware/client';

const tracker = createTracker({
  trackingId: '72Dymb73P94vgPYeB',
  endpoint: '/service/__a' // must match server endpoint
});

tracker.track(); // call on each route change when `auto` is false
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
| `trackingId` | ostr.io tracking id (exactly 17 URL-safe characters: letters, digits, `_`, `-`) |
| `endpoint` | Beacon mount path, e.g. `/service/__a`. Trailing slashes are stripped |
| `hostname` | Public hostname used as `Set-Cookie` `Domain` |

Beacons are matched at `GET {endpoint}/{trackingId}.gif`.

### Optional

| Field | Default | Description |
|-------|---------|-------------|
| `serviceOrigin` | `https://analytics.ostr.io` | Upstream HTTPS origin (path/query ignored) |
| `defaultReferer` | `https://{hostname}/` | Referer sent when the browser omits one |
| `forwardedCookies` | `['ot']` | Outbound cookie names allowlist |
| `responseHeaders` | `content-type`, `cache-control`, `expires`, `pragma` | Upstream response headers allowlist |
| `upstreamTimeoutMs` | `3072` | Upstream socket timeout |
| `wallTimeoutMs` | `4000` | Total handler wall-clock timeout |
| `maxSearchLen` | `4096` | Max query string length; longer → `204` without upstream |
| `resolveClientIp` | see below | Client IP forwarded to ostr.io |

Invalid config (bad `trackingId` shape, empty `endpoint`/`hostname`, non-HTTPS `serviceOrigin`) throws at construction time.

`resolveConfig(config)` is the same validation used by the constructor; it returns the resolved runtime config.

Security and proxy failure behavior: [docs/security.md](https://github.com/ostr-io/ostrio-analytics-middleware/blob/master/docs/security.md).
Meteor resolver compatibility: [docs/meteor.md](https://github.com/ostr-io/ostrio-analytics-middleware/blob/master/docs/meteor.md).

## Package exports

| Import | Purpose |
|--------|---------|
| `@ostrio/analytics-middleware` | `OstrioAnalyticsMiddleware`, `resolveConfig`, config types |
| `@ostrio/analytics-middleware/client` | `createTracker`, `OstrioWebAnalytics`, `CreateTrackerOptions`, client types |

Dual **ESM** and **CJS** builds with TypeScript declarations.

Publishing checklist and npm organization requirements: [docs/publishing.md](https://github.com/ostr-io/ostrio-analytics-middleware/blob/master/docs/publishing.md).

## License

BSD-3-Clause — see [LICENSE](LICENSE).
