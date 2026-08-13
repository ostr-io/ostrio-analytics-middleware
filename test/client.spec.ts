import { expect } from 'chai';
import globalJsdom from 'global-jsdom';
import sinon from 'sinon';
import { createTracker, Transport } from '../src/client.js';

describe('createTracker', () => {
  let cleanup: () => void;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    cleanup = globalJsdom('', { url: 'https://example.com/' });
    document.title = 'Test';
    clock = sinon.useFakeTimers({ now: Date.now() });
    (globalThis as { fetch?: unknown }).fetch = sinon.stub().resolves({});
  });

  afterEach(() => {
    clock.runAll();
    clock.restore();
    delete (globalThis as { fetch?: unknown }).fetch;
    cleanup();
  });

  it('sets serviceUrl from endpoint and applies defaults', () => {
    const t = createTracker({
      trackingId: '72Dymb73P94vgPYeB',
      endpoint: '/service/__a'
    });
    expect(t.serviceUrl).to.equal('/service/__a/');
    expect(t.transport).to.equal('fetch');
    expect(t.auto).to.equal(false);
    t.destroy();
  });

  it('allows overriding transport and auto', () => {
    const t = createTracker({
      trackingId: '72Dymb73P94vgPYeB',
      endpoint: '/service/__a',
      transport: Transport.Img,
      auto: true
    });
    expect(t.transport).to.equal('img');
    expect(t.auto).to.equal(true);
    t.destroy();
  });
});
