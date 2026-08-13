import OstrioWebAnalytics, {
  type OstrioWebAnalyticsConfig,
  Transport
} from 'ostrio-analytics';

export { OstrioWebAnalytics, Transport };
export type { OstrioWebAnalyticsConfig };

export interface CreateTrackerOptions extends OstrioWebAnalyticsConfig {
  trackingId: string;
  endpoint: string;
}

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
