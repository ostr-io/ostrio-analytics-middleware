import https from 'node:https';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import type { RequestOptions } from 'node:https';
import type { ResolvedMiddlewareConfig } from './types.js';
import { filterCookies, rewriteSetCookie, setCookieName } from './cookies.js';

const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  maxFreeSockets: 8
});
const MAX_UPSTREAM_BODY_BYTES = 256 * 1024;

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

const defaultRequestFn: HttpsRequestFn = (url, options, callback) =>
  https.request(url, options, callback);

export const proxyBeacon = (
  httpReq: IncomingMessage,
  httpResp: ServerResponse,
  config: ResolvedMiddlewareConfig,
  search: string,
  requestFn: HttpsRequestFn = defaultRequestFn
): void => {
  let settled = false;
  let upstreamReq: ClientRequest | null = null;
  const clientSocket = httpReq.socket;
  let onClientAborted: (() => void) | undefined;
  let onClientSocketError: (() => void) | undefined;
  let onUpstreamError: (() => void) | undefined;
  let onUpstreamTimeout: (() => void) | undefined;
  const timers = {
    wall: undefined as ReturnType<typeof setTimeout> | undefined
  };

  const cleanup = (): void => {
    if (onClientAborted) {
      httpReq.removeListener('aborted', onClientAborted);
    }
    if (onClientSocketError && clientSocket) {
      clientSocket.removeListener('error', onClientSocketError);
    }
    if (upstreamReq && onUpstreamError) {
      upstreamReq.removeListener('error', onUpstreamError);
    }
    if (upstreamReq && onUpstreamTimeout) {
      upstreamReq.removeListener('timeout', onUpstreamTimeout);
    }
  };

  function settle(opts: { statusCode?: number; destroyUpstream?: boolean } = {}): void {
    if (settled) {
      return;
    }
    settled = true;
    if (timers.wall !== undefined) {
      clearTimeout(timers.wall);
    }
    if (opts.destroyUpstream !== false && upstreamReq && !upstreamReq.destroyed) {
      const ignoreDestroyError = (): void => undefined;
      upstreamReq.once('error', ignoreDestroyError);
      try {
        upstreamReq.destroy();
      } catch {
        upstreamReq.removeListener('error', ignoreDestroyError);
      }
    }
    cleanup();
    endClient(httpResp, opts.statusCode);
  }

  timers.wall = setTimeout(() => {
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

  const onFail = (): void => {
    settle({ statusCode: 204 });
  };

  try {
    const clientIp = config.resolveClientIp(httpReq);
    if (clientIp) {
      reqHeaders['X-Forwarded-For'] = clientIp;
      reqHeaders['X-Connecting-IP'] = clientIp;
    }

    const url = new URL(config.serviceOrigin);
    url.pathname = `/${config.trackingId}.gif`;
    url.search = search;
    url.hash = '';

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

        const chunks: Buffer[] = [];
        let bodyBytes = 0;

        resp.on('data', (chunk: Buffer | string) => {
          if (settled) {
            return;
          }

          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bodyBytes += buffer.length;
          if (bodyBytes > MAX_UPSTREAM_BODY_BYTES) {
            settle({ statusCode: 204 });
            return;
          }
          chunks.push(buffer);
        });

        resp.on('end', () => {
          if (settled) {
            return;
          }
          if (!httpResp.headersSent) {
            httpResp.writeHead(resp.statusCode ?? 204);
          }
          if (chunks.length && !httpResp.finished && !httpResp.writableEnded && !httpResp.writableFinished) {
            httpResp.write(Buffer.concat(chunks, bodyBytes));
          }
          settle({ destroyUpstream: false });
        });

        resp.on('error', () => {
          settle({ statusCode: 204 });
        });
      }
    );

    onClientAborted = onFail;
    onClientSocketError = onFail;
    onUpstreamError = onFail;
    onUpstreamTimeout = onFail;
    httpReq.once('aborted', onClientAborted);
    clientSocket?.once('error', onClientSocketError);
    upstreamReq.once('error', onUpstreamError);
    upstreamReq.once('timeout', onUpstreamTimeout);

    upstreamReq.setNoDelay(true);
    upstreamReq.end();
  } catch {
    settle({ statusCode: 204 });
  }
};
