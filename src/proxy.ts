import https from 'node:https';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import type { RequestOptions } from 'node:https';
import type { ResolvedMiddlewareConfig } from './types.js';
import { filterCookies, rewriteSetCookie, setCookieName } from './cookies.js';

const keepAliveAgent = new https.Agent({ keepAlive: true });

export type HttpsRequestFn = (
  url: string | URL,
  options: RequestOptions,
  callback?: (res: IncomingMessage) => void
) => ClientRequest;

const endClient = (httpResp: ServerResponse, statusCode?: number): void => {
  if (!httpResp.headersSent && typeof statusCode === 'number') {
    httpResp.writeHead(statusCode);
  }
  if (!httpResp.finished && !httpResp.writableEnded && !httpResp.writableFinished) {
    httpResp.end();
  }
};

export const proxyBeacon = (
  httpReq: IncomingMessage,
  httpResp: ServerResponse,
  config: ResolvedMiddlewareConfig,
  search: string,
  requestFn: HttpsRequestFn = https.request.bind(https) as HttpsRequestFn
): void => {
  let settled = false;
  let upstreamReq: ClientRequest | null = null;

  const settle = (opts: { statusCode?: number; destroyUpstream?: boolean } = {}): void => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(wallTimer);
    if (opts.destroyUpstream !== false && upstreamReq && !upstreamReq.destroyed) {
      try {
        upstreamReq.destroy();
      } catch {
        // ignore
      }
    }
    endClient(httpResp, opts.statusCode);
  };

  const wallTimer = setTimeout(() => {
    settle({ statusCode: 204 });
  }, config.wallTimeoutMs);

  if (search.length > config.maxSearchLen) {
    settle({ statusCode: 204 });
    return;
  }

  const reqHeaders: Record<string, string> = {
    Accept: typeof httpReq.headers.accept === 'string' ? httpReq.headers.accept : '*/*',
    Referer: typeof httpReq.headers.referer === 'string' ? httpReq.headers.referer : config.defaultReferer
  };

  const cookies = filterCookies(
    typeof httpReq.headers.cookie === 'string' ? httpReq.headers.cookie : undefined,
    config.forwardedCookies
  );
  if (cookies) {
    reqHeaders.Cookie = cookies;
  }

  if (typeof httpReq.headers['user-agent'] === 'string') {
    reqHeaders['User-Agent'] = httpReq.headers['user-agent'];
  }

  const clientIp = config.resolveClientIp(httpReq);
  if (clientIp) {
    reqHeaders['X-Forwarded-For'] = clientIp;
    reqHeaders['X-Connecting-IP'] = clientIp;
  }

  const url = new URL(`${config.serviceOrigin}/${config.trackingId}.gif${search}`);

  upstreamReq = requestFn(
    url,
    {
      method: 'GET',
      headers: reqHeaders,
      agent: keepAliveAgent,
      timeout: config.upstreamTimeoutMs
    },
    (resp) => {
      if (settled) {
        resp.resume();
        return;
      }

      for (const rawName in resp.headers) {
        if (!Object.prototype.hasOwnProperty.call(resp.headers, rawName)) {
          continue;
        }
        const value = resp.headers[rawName];
        if (!value) {
          continue;
        }
        const hName = rawName.toLowerCase();
        if (httpResp.headersSent || httpResp.finished || httpResp.writableEnded) {
          continue;
        }

        if (hName === 'set-cookie') {
          const list = Array.isArray(value) ? value : [value];
          const rewritten: string[] = [];
          for (const item of list) {
            if (config.forwardedCookies.has(setCookieName(item))) {
              rewritten.push(
                rewriteSetCookie(item, {
                  trackingId: config.trackingId,
                  beaconPath: config.beaconPath,
                  hostname: config.hostname
                })
              );
            }
          }
          if (rewritten.length) {
            httpResp.setHeader('set-cookie', rewritten);
          }
          continue;
        }

        if (!config.responseHeaders.has(hName)) {
          continue;
        }
        httpResp.setHeader(hName, value);
      }

      if (!httpResp.headersSent) {
        httpResp.writeHead(resp.statusCode ?? 204);
      }

      resp.on('data', (chunk: Buffer | string) => {
        if (!settled && !httpResp.finished && !httpResp.writableEnded && !httpResp.writableFinished) {
          httpResp.write(chunk);
        }
      });

      resp.on('end', () => {
        settle({ destroyUpstream: false });
      });

      resp.on('error', () => {
        settle({ statusCode: 204 });
      });
    }
  );

  const onFail = (): void => {
    settle({ statusCode: 204 });
  };

  httpReq.on('aborted', () => onFail());
  httpReq.socket?.on('error', onFail);
  upstreamReq.on('error', onFail);
  upstreamReq.on('timeout', onFail);

  upstreamReq.setNoDelay(true);
  upstreamReq.end();
};
