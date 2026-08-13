import { expect } from 'chai';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import sinon from 'sinon';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { OstrioAnalyticsMiddleware } from '../src/middleware.js';

const base = {
  trackingId: '72Dymb73P94vgPYeB',
  endpoint: '/service/__a',
  hostname: 'localhost'
};

const beaconUrl = `/service/__a/${base.trackingId}.gif`;

type FakeReqOpts = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  remoteAddress?: string;
};

const fakeReq = (opts: FakeReqOpts = {}): IncomingMessage => {
  const ee = new EventEmitter() as unknown as IncomingMessage & EventEmitter;
  ee.method = opts.method ?? 'GET';
  ee.url = opts.url ?? '/';
  ee.headers = opts.headers ?? {};
  const socket = new EventEmitter() as unknown as IncomingMessage['socket'] & EventEmitter;
  (socket as { remoteAddress?: string }).remoteAddress = opts.remoteAddress ?? '127.0.0.1';
  ee.socket = socket;
  return ee;
};

type FakeRes = ServerResponse & {
  statusCode: number;
  headersSent: boolean;
  finished: boolean;
  writableEnded: boolean;
  writableFinished: boolean;
  _headers: Record<string, string | string[]>;
  _body: Buffer[];
};

const fakeRes = (): FakeRes => {
  const res = {
    statusCode: 200,
    headersSent: false,
    finished: false,
    writableEnded: false,
    writableFinished: false,
    _headers: {} as Record<string, string | string[]>,
    _body: [] as Buffer[],
    writeHead(code: number) {
      if (!this.headersSent) {
        this.statusCode = code;
        this.headersSent = true;
      }
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this._headers[name.toLowerCase()] = value;
    },
    write(chunk: Buffer | string) {
      this._body.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    },
    end(chunk?: Buffer | string) {
      if (chunk) {
        this.write(chunk);
      }
      this.finished = true;
      this.writableEnded = true;
      this.writableFinished = true;
      if (!this.headersSent) {
        this.headersSent = true;
      }
      return this;
    }
  };
  return res as unknown as FakeRes;
};

type FakeIncoming = EventEmitter & {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  resume: () => void;
};

const fakeUpstreamResp = (
  statusCode: number,
  headers: Record<string, string | string[] | undefined>
): FakeIncoming => {
  const resp = new EventEmitter() as FakeIncoming;
  resp.statusCode = statusCode;
  resp.headers = headers;
  resp.resume = () => undefined;
  return resp;
};

type FakeClientReq = EventEmitter & {
  destroyed: boolean;
  setNoDelay: (v?: boolean) => void;
  end: () => void;
  destroy: () => void;
};

const createFakeClientReq = (onEnd?: (req: FakeClientReq) => void): FakeClientReq => {
  const req = new EventEmitter() as FakeClientReq;
  req.destroyed = false;
  req.setNoDelay = () => undefined;
  req.destroy = () => {
    req.destroyed = true;
  };
  req.end = () => {
    if (onEnd) {
      onEnd(req);
    }
  };
  return req;
};

describe('middleware()', () => {
  it('calls next() when handle returns false', () => {
    const mw = new OstrioAnalyticsMiddleware(base);
    const next = sinon.spy();
    mw.middleware()(fakeReq({ method: 'GET', url: '/other' }), fakeRes(), next);
    expect(next.calledOnce).to.equal(true);
  });

  it('does not call next() when beacon is handled', () => {
    const requestStub = sinon.stub(https, 'request').callsFake((_url: unknown, _opts: unknown, cb: unknown) => {
      const callback = cb as (res: FakeIncoming) => void;
      const clientReq = createFakeClientReq(() => {
        const resp = fakeUpstreamResp(204, { 'content-type': 'image/gif' });
        callback(resp);
        resp.emit('end');
      });
      return clientReq as unknown as ReturnType<typeof https.request>;
    });

    try {
      const mw = new OstrioAnalyticsMiddleware(base);
      const next = sinon.spy();
      mw.middleware()(fakeReq({ method: 'GET', url: beaconUrl }), fakeRes(), next);
      expect(next.called).to.equal(false);
    } finally {
      requestStub.restore();
    }
  });
});
