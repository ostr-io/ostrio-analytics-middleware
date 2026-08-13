import {
  OstrioAnalyticsMiddleware,
  type OstrioAnalyticsMiddlewareConfig
} from '@ostrio/analytics-middleware';
import { createTracker, type CreateTrackerOptions } from '@ostrio/analytics-middleware/client';

const config = {
  trackingId: 'fffffffffffffffff',
  endpoint: '/service/__a',
  hostname: 'example.test'
} satisfies OstrioAnalyticsMiddlewareConfig;

const middleware = new OstrioAnalyticsMiddleware(config);
const trackerOptions = {
  trackingId: config.trackingId,
  endpoint: config.endpoint,
  auto: false
} satisfies CreateTrackerOptions;
const tracker = createTracker(trackerOptions);

tracker.track();
tracker.destroy();
void middleware;
