import OstrioWebAnalytics, {
  type OstrioWebAnalyticsConfig,
  Transport
} from 'ostrio-analytics';
import type { CreateTrackerOptions } from './types.js';

export { OstrioWebAnalytics, Transport };
export type { OstrioWebAnalyticsConfig, CreateTrackerOptions };

export const createTracker = (opts: CreateTrackerOptions): OstrioWebAnalytics => {
  const { trackingId, endpoint, ...rest } = opts;
  const serviceUrl = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
  return new OstrioWebAnalytics(trackingId, {
    auto: false,
    transport: Transport.Fetch,
    serviceUrl,
    ...rest
  });
};
