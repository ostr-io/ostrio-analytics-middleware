import { expect } from 'chai';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import sinon from 'sinon';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { OstrioAnalyticsMiddleware } from '../src/middleware.js';

const base = {
  trackingId: '72Dymb73P94vgPYeB', // 17 chars
  endpoint: '/service/__a',
  hostname: 'localhost'
};

const beaconUrl = '/service/__a/72Dymb73P94vgPYeB.gif';

type FakeReqOpts = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  remoteAddress?: string;
};

const fakeReq = (opts: FakeReqOpts = {}): IncomingMessage => {
  const ee = new EventEmitter() as IncomingMessage & EventEmitter;
  ee.method = opts.method ?? 'GET';
  ee.url = opts.url ?? '/';
  ee.headers = opts.headers ?? {};
  const socket = new EventEmitter() as IncomingMessage['socket'] & EventEmitter;
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
  return res as FakeRes;
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

describe('OstrioAnalyticsMiddleware constructor', () => {
  it('throws when trackingId length !== 17', () => {
    expect(() => new OstrioAnalyticsMiddleware({ ...base, trackingId: 'short' })).to.throw();
  });

  it('throws when endpoint empty', () => {
    expect(() => new OstrioAnalyticsMiddleware({ ...base, endpoint: '' })).to.throw();
  });
});

describe('handle matching', () => {
  let requestStub: sinon.SinonStub;

  beforeEach(() => {
    requestStub = sinon.stub(https, 'request');
  });

  afterEach(() => {
    requestStub.restore();
  });

  it('returns false for non-GET', () => {
    const mw = new OstrioAnalyticsMiddleware(base);
    const res = fakeRes();
    expect(mw.handle(fakeReq({ method: 'POST', url: '/service/__a/72Dymb73P94vgPYeB.gif' }), res)).to.equal(false);
    expect(requestStub.called).to.equal(false);
  });

  it('returns false for wrong path / traversal / wrong sid', () => {
    const mw = new OstrioAnalyticsMiddleware(base);
    const paths = [
      '/service/__a/72Dymb73P94vgPYeB.gif/../../admin',
      '/service/__a/WRONGSID12345678.gif',
      '/service/__a/72Dymb73P94vgPYeB.gif/foo'
    ];
    for (const url of paths) {
      expect(mw.handle(fakeReq({ method: 'GET', url }), fakeRes())).to.equal(false);
    }
    expect(requestStub.called).to.equal(false);
  });

  it('returns false when pathname only starts with endpoint', () => {
    const mw = new OstrioAnalyticsMiddleware(base);
    expect(mw.handle(fakeReq({ method: 'GET', url: '/service/__abc/72Dymb73P94vgPYeB.gif' }), fakeRes())).to.equal(false);
    expect(requestStub.called).to.equal(false);
  });
});

describe('handle proxy', () => {
  let requestStub: sinon.SinonStub;

  afterEach(() => {
    if (requestStub) {
      requestStub.restore();
    }
  });

  it('matching GET calls upstream GET https://analytics.ostr.io/{id}.gif{search}', () => {
    let capturedUrl: URL | string | undefined;
    let capturedOpts: https.RequestOptions | undefined;

    requestStub = sinon.stub(https, 'request').callsFake((url: unknown, opts: unknown, cb: unknown) => {
      capturedUrl = url as URL;
      capturedOpts = opts as https.RequestOptions;
      const callback = cb as (res: FakeIncoming) => void;
      const clientReq = createFakeClientReq(() => {
        const resp = fakeUpstreamResp(200, { 'content-type': 'image/gif' });
        callback(resp);
        resp.emit('data', Buffer.from('GIF89a'));
        resp.emit('end');
      });
      return clientReq as unknown as ReturnType<typeof https.request>;
    });

    const mw = new OstrioAnalyticsMiddleware(base);
    const res = fakeRes();
    const result = mw.handle(fakeReq({ method: 'GET', url: `${beaconUrl}?x=1` }), res);

    expect(result).to.equal(undefined);
    expect(requestStub.calledOnce).to.equal(true);
    expect(String(capturedUrl)).to.equal(`https://analytics.ostr.io/${base.trackingId}.gif?x=1`);
    expect(capturedOpts?.method).to.equal('GET');
    expect(res.finished).to.equal(true);
  });

  it('forwards only ot cookie', () => {
    let capturedOpts: https.RequestOptions | undefined;

    requestStub = sinon.stub(https, 'request').callsFake((_url: unknown, opts: unknown, cb: unknown) => {
      capturedOpts = opts as https.RequestOptions;
      const callback = cb as (res: FakeIncoming) => void;
      const clientReq = createFakeClientReq(() => {
        const resp = fakeUpstreamResp(200, { 'content-type': 'image/gif' });
        callback(resp);
        resp.emit('end');
      });
      return clientReq as unknown as ReturnType<typeof https.request>;
    });

    const mw = new OstrioAnalyticsMiddleware(base);
    mw.handle(
      fakeReq({
        method: 'GET',
        url: beaconUrl,
        headers: { cookie: 'ot=keep; session=secret; OT=also' }
      }),
      fakeRes()
    );

    const headers = capturedOpts?.headers as Record<string, string> | undefined;
    expect(headers?.Cookie).to.equal('ot=keep; OT=also');
  });

  it('caps search: length > maxSearchLen → 204, no upstream', () => {
    requestStub = sinon.stub(https, 'request');
    const mw = new OstrioAnalyticsMiddleware({ ...base, maxSearchLen: 10 });
    const res = fakeRes();
    const longSearch = `?${'a'.repeat(20)}`;
    const result = mw.handle(fakeReq({ method: 'GET', url: `${beaconUrl}${longSearch}` }), res);

    expect(result).to.equal(undefined);
    expect(requestStub.called).to.equal(false);
    expect(res.statusCode).to.equal(204);
    expect(res.finished).to.equal(true);
  });

  it('on upstream error → response 204', () => {
    requestStub = sinon.stub(https, 'request').callsFake((_url: unknown, _opts: unknown, _cb: unknown) => {
      const clientReq = createFakeClientReq(() => {
        clientReq.emit('error', new Error('upstream fail'));
      });
      return clientReq as unknown as ReturnType<typeof https.request>;
    });

    const mw = new OstrioAnalyticsMiddleware(base);
    const res = fakeRes();
    mw.handle(fakeReq({ method: 'GET', url: beaconUrl }), res);

    expect(res.statusCode).to.equal(204);
    expect(res.finished).to.equal(true);
  });

  it('rewrites multiple set-cookie for ot only; drops other cookie names', () => {
    requestStub = sinon.stub(https, 'request').callsFake((_url: unknown, _opts: unknown, cb: unknown) => {
      const callback = cb as (res: FakeIncoming) => void;
      const clientReq = createFakeClientReq(() => {
        const resp = fakeUpstreamResp(200, {
          'content-type': 'image/gif',
          'set-cookie': [
            `ot=1; Path=/${base.trackingId}.gif; Domain=analytics.ostr.io`,
            'session=nope; Path=/; Domain=analytics.ostr.io',
            `OT=2; Path=/${base.trackingId}.gif; Domain=ANALYTICS.OSTR.IO`
          ]
        });
        callback(resp);
        resp.emit('end');
      });
      return clientReq as unknown as ReturnType<typeof https.request>;
    });

    const mw = new OstrioAnalyticsMiddleware(base);
    const res = fakeRes();
    mw.handle(fakeReq({ method: 'GET', url: beaconUrl }), res);

    const setCookie = res._headers['set-cookie'];
    expect(setCookie).to.be.an('array');
    const list = setCookie as string[];
    expect(list).to.have.length(2);
    expect(list[0]).to.include(beaconUrl);
    expect(list[0]).to.include('localhost');
    expect(list[0]).to.not.include('analytics.ostr.io');
    expect(list[1]).to.include(beaconUrl);
    expect(list.join('\n')).to.not.match(/session=/i);
  });

  it('relays only allowlisted response headers', () => {
    requestStub = sinon.stub(https, 'request').callsFake((_url: unknown, _opts: unknown, cb: unknown) => {
      const callback = cb as (res: FakeIncoming) => void;
      const clientReq = createFakeClientReq(() => {
        const resp = fakeUpstreamResp(200, {
          'content-type': 'image/gif',
          'cache-control': 'no-store',
          location: 'https://evil.example/',
          'x-powered-by': 'secret'
        });
        callback(resp);
        resp.emit('end');
      });
      return clientReq as unknown as ReturnType<typeof https.request>;
    });

    const mw = new OstrioAnalyticsMiddleware(base);
    const res = fakeRes();
    mw.handle(fakeReq({ method: 'GET', url: beaconUrl }), res);

    expect(res._headers['content-type']).to.equal('image/gif');
    expect(res._headers['cache-control']).to.equal('no-store');
    expect(res._headers.location).to.equal(undefined);
    expect(res._headers['x-powered-by']).to.equal(undefined);
  });
});
