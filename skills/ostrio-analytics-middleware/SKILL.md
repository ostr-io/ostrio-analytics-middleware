---
name: ostrio-analytics-middleware
description: Use when adding ostr.io first-party analytics beacon proxy in Connect, Express, Node.js, Bun.js, or Meteor.js.
---

# ostrio-analytics-middleware

Proxies ostr.io GIF beacons through the app origin so cookies stay first-party.

## Install

```bash
npm install @ostrio/analytics-middleware ostrio-analytics
```

```bash
npx skills add ostr-io/ostrio-analytics-middleware -g --skill ostrio-analytics-middleware
```

## Server

```ts
import { OstrioAnalyticsMiddleware } from '@ostrio/analytics-middleware';

const analytics = new OstrioAnalyticsMiddleware({
  trackingId: '{{trackingId}}', // 17 URL-safe chars
  endpoint: '/service/__a',     // no trailing slash
  hostname: 'example.com'
});

app.use(analytics.middleware());
```

Meteor: `WebApp.connectHandlers.use(analytics.middleware())` before other handlers.

`handle(req, res)` returns `false` when the request is not the beacon; otherwise it writes the response.

## Client

```ts
import { createTracker } from '@ostrio/analytics-middleware/client';

const tracker = createTracker({
  trackingId: '{{trackingId}}',
  endpoint: '/service/__a'
});
tracker.track();
```

Meteor 2.x: root `client.js` / `client.cjs` shims exist because that resolver ignores `package.json` `exports`.

## Rules

- Match only `GET {endpoint}/{trackingId}.gif`.
- `serviceOrigin` is HTTPS operator config, never request-derived.
- Default cookie allowlist is `ot`. Default IP resolver trusts `cf-connecting-ip` only when `cf-ray` is also a string.
- Failures and timeouts respond `204`; do not throw into host middleware.
- Deeper notes: `docs/security.md`, `docs/meteor.md`.
