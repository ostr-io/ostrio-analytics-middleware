import type { IncomingMessage } from 'node:http';

export interface OstrioAnalyticsMiddlewareConfig {
  trackingId: string;
  endpoint: string;
  hostname: string;
  serviceOrigin?: string;
  defaultReferer?: string;
  forwardedCookies?: string[];
  responseHeaders?: string[];
  upstreamTimeoutMs?: number;
  wallTimeoutMs?: number;
  maxSearchLen?: number;
  resolveClientIp?: (req: IncomingMessage) => string | false;
}

export interface ResolvedMiddlewareConfig {
  trackingId: string;
  endpoint: string;
  hostname: string;
  beaconPath: string;
  serviceOrigin: string;
  defaultReferer: string;
  forwardedCookies: Set<string>;
  responseHeaders: Set<string>;
  upstreamTimeoutMs: number;
  wallTimeoutMs: number;
  maxSearchLen: number;
  resolveClientIp: (req: IncomingMessage) => string | false;
}
