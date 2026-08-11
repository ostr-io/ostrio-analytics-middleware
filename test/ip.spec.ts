import { expect } from 'chai';
import { defaultResolveClientIp } from '../src/ip.js';

describe('defaultResolveClientIp', () => {
  it('uses cf-connecting-ip when cf-ray present', () => {
    expect(defaultResolveClientIp({
      headers: { 'cf-ray': '1', 'cf-connecting-ip': '1.2.3.4' },
      socket: { remoteAddress: '9.9.9.9' }
    } as any)).to.equal('1.2.3.4');
  });

  it('ignores cf-connecting-ip without cf-ray', () => {
    expect(defaultResolveClientIp({
      headers: { 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '8.8.8.8' },
      socket: { remoteAddress: '9.9.9.9' }
    } as any)).to.equal('9.9.9.9');
  });
});
