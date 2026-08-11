import {
  OstrioAnalyticsMiddleware,
  type OstrioAnalyticsMiddlewareConfig
} from 'ostrio-analytics-middleware';

import {
  createTracker,
  Transport,
  type CreateTrackerOptions
} from 'ostrio-analytics-middleware/client';

const config = {
  trackingId: 'fffffffffffffffff',
  endpoint: '/__a',
  hostname: 'example.test'
} satisfies OstrioAnalyticsMiddlewareConfig;

const middleware = new OstrioAnalyticsMiddleware(config);

const trackerOpts = {
  trackingId: 'fffffffffffffffff',
  endpoint: '/__a',
  auto: false,
  transport: Transport.Fetch
} satisfies CreateTrackerOptions;

const tracker = createTracker(trackerOpts);
tracker.setTransport(Transport.Beacon);
tracker.destroy();

void middleware;
void tracker;
