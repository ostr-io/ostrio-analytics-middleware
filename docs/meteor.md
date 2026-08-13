# Meteor.js

## Server

Server integration uses `WebApp.connectHandlers`:

```js
import { WebApp } from 'meteor/webapp';
import { OstrioAnalyticsMiddleware } from '@ostrio/analytics-middleware';

const analytics = new OstrioAnalyticsMiddleware({
  trackingId: Meteor.settings.public.ostrio.trackingId,
  endpoint: '/service/__a',
  hostname: new URL(Meteor.absoluteUrl()).hostname
});

WebApp.connectHandlers.use(analytics.middleware());
```

Register before application handlers. Non-beacon requests call `next()`.

## Client

Install both packages when client tracking is used:

```bash
meteor npm install @ostrio/analytics-middleware ostrio-analytics
```

```js
import { createTracker } from '@ostrio/analytics-middleware/client';

const tracker = createTracker({
  trackingId: Meteor.settings.public.ostrio.trackingId,
  endpoint: '/service/__a'
});

FlowRouter.triggers.enter({
  enter() {
    Tracker.afterFlush(() => tracker.track());
  }
});
```

Meteor 2.x resolvers may ignore `package.json` `exports`; package root includes `client.js` and `client.cjs` shims for this case. TypeScript on those resolvers uses `typesVersions` for the `client` subpath. Meteor 3 uses package exports normally.
