import { expect } from 'chai';
import type { IncomingMessage } from 'node:http';
import { parseRequestUrl } from '../src/parse-url.js';

describe('parseRequestUrl', () => {
  it('returns pathname and search from req.url', () => {
    const r = parseRequestUrl({ url: '/service/__a/sid.gif?6=x&v=300' } as IncomingMessage);
    expect(r.pathname).to.equal('/service/__a/sid.gif');
    expect(r.search).to.equal('?6=x&v=300');
  });

  it('returns empty search when absent', () => {
    const r = parseRequestUrl({ url: '/service/__a/sid.gif' } as IncomingMessage);
    expect(r.pathname).to.equal('/service/__a/sid.gif');
    expect(r.search).to.equal('');
  });
});
