import {
  OstrioAnalyticsMiddleware,
  resolveConfig,
  type OstrioAnalyticsMiddlewareConfig,
  type ResolvedMiddlewareConfig
} from 'ostrio-analytics-middleware';

import {
  createTracker,
  Transport,
  type CreateTrackerOptions,
  type OstrioWebAnalytics,
  type OstrioWebAnalyticsConfig
} from 'ostrio-analytics-middleware/client';

const config: OstrioAnalyticsMiddlewareConfig = {
  trackingId: 'fffffffffffffffff',
  endpoint: '/__a',
  hostname: 'example.test',
  serviceOrigin: 'https://analytics.example.test',
  forwardedCookies: ['ot'],
  responseHeaders: ['content-type'],
  upstreamTimeoutMs: 3000,
  wallTimeoutMs: 4000,
  maxSearchLen: 2048
};

const middleware: OstrioAnalyticsMiddleware = new OstrioAnalyticsMiddleware(config);
const resolved: ResolvedMiddlewareConfig = resolveConfig(config);

const trackerConfig: OstrioWebAnalyticsConfig = {
  auto: false,
  transport: Transport.Fetch
};

const trackerOpts: CreateTrackerOptions = {
  trackingId: 'fffffffffffffffff',
  endpoint: '/__a',
  ...trackerConfig
};

const tracker: OstrioWebAnalytics = createTracker(trackerOpts);
tracker.setTransport(Transport.Fetch);
tracker.setTransport(Transport.Beacon);
tracker.destroy();

void middleware;
void resolved;
void tracker;
