import type {
  OstrioAnalyticsMiddlewareConfig,
  ResolvedMiddlewareConfig
} from './types.js';
import { defaultResolveClientIp } from './ip.js';

const DEFAULT_SERVICE_ORIGIN = 'https://analytics.ostr.io';
const DEFAULT_FORWARDED_COOKIES = ['ot'];
const DEFAULT_RESPONSE_HEADERS = ['content-type', 'cache-control', 'expires', 'pragma'];
const DEFAULT_UPSTREAM_TIMEOUT_MS = 3072;
const DEFAULT_WALL_TIMEOUT_MS = 4000;
const DEFAULT_MAX_SEARCH_LEN = 4096;

const toLowerSet = (names: string[]): Set<string> => {
  const out = new Set<string>();
  for (const name of names) {
    out.add(name.toLowerCase());
  }
  return out;
};

const resolveServiceOrigin = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('OstrioAnalyticsMiddleware: serviceOrigin must be a valid HTTPS origin');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('OstrioAnalyticsMiddleware: serviceOrigin must be a valid HTTPS origin');
  }
  return url.origin;
};

export const resolveConfig = (
  config: OstrioAnalyticsMiddlewareConfig
): ResolvedMiddlewareConfig => {
  if (typeof config.trackingId !== 'string' || !/^[A-Za-z0-9_-]{17}$/.test(config.trackingId)) {
    throw new Error('OstrioAnalyticsMiddleware: trackingId must be exactly 17 URL-safe characters');
  }
  if (typeof config.endpoint !== 'string' || config.endpoint.length === 0) {
    throw new Error('OstrioAnalyticsMiddleware: endpoint must be a non-empty string');
  }
  if (typeof config.hostname !== 'string' || config.hostname.length === 0) {
    throw new Error('OstrioAnalyticsMiddleware: hostname must be a non-empty string');
  }
  if (/[\s;,"\r\n\0]/.test(config.hostname)) {
    throw new Error('OstrioAnalyticsMiddleware: hostname must not contain whitespace or cookie delimiters');
  }

  const endpoint = config.endpoint.replace(/\/+$/, '');
  if (!endpoint || !endpoint.startsWith('/') || /[\s?#]/.test(endpoint) || endpoint.includes('..')) {
    throw new Error('OstrioAnalyticsMiddleware: endpoint must be a URL path without trailing slash');
  }

  const serviceOrigin = resolveServiceOrigin(config.serviceOrigin ?? DEFAULT_SERVICE_ORIGIN);
  const defaultReferer = config.defaultReferer ?? `https://${config.hostname}/`;
  const forwardedCookies = toLowerSet(config.forwardedCookies ?? DEFAULT_FORWARDED_COOKIES);
  const responseHeaders = toLowerSet(config.responseHeaders ?? DEFAULT_RESPONSE_HEADERS);

  return {
    trackingId: config.trackingId,
    endpoint,
    hostname: config.hostname,
    beaconPath: `${endpoint}/${config.trackingId}.gif`,
    serviceOrigin,
    defaultReferer,
    forwardedCookies,
    responseHeaders,
    upstreamTimeoutMs: config.upstreamTimeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS,
    wallTimeoutMs: config.wallTimeoutMs ?? DEFAULT_WALL_TIMEOUT_MS,
    maxSearchLen: config.maxSearchLen ?? DEFAULT_MAX_SEARCH_LEN,
    resolveClientIp: config.resolveClientIp ?? defaultResolveClientIp
  };
};
