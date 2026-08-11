import type { IncomingMessage, ServerResponse } from 'node:http';
import type { OstrioAnalyticsMiddlewareConfig, ResolvedMiddlewareConfig } from './types.js';
import { parseRequestUrl } from './parse-url.js';
import { resolveConfig } from './resolve-config.js';
import { proxyBeacon } from './proxy.js';

export class OstrioAnalyticsMiddleware {
  readonly config: ResolvedMiddlewareConfig;

  constructor(config: OstrioAnalyticsMiddlewareConfig) {
    this.config = resolveConfig(config);
  }

  /**
   * false = not this beacon (caller should next()); void = handled
   */
  handle(req: IncomingMessage, res: ServerResponse): false | void {
    if (req.method !== 'GET') {
      return false;
    }

    const { pathname, search } = parseRequestUrl(req);
    if (pathname !== this.config.beaconPath) {
      return false;
    }

    proxyBeacon(req, res, this.config, search);
    return undefined;
  }

  middleware() {
    return (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
      if (this.handle(req, res) !== false) {
        return;
      }
      next();
    };
  }
}
