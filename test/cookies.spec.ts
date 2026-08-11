import { expect } from 'chai';
import { filterCookies, setCookieName, rewriteSetCookie } from '../src/cookies.js';

describe('cookies', () => {
  it('filterCookies keeps only allowlisted names', () => {
    const out = filterCookies('ot=1; session=secret; OT=2', new Set(['ot']));
    expect(out).to.equal('ot=1; OT=2');
  });

  it('filterCookies returns false when none match', () => {
    expect(filterCookies('session=x', new Set(['ot']))).to.equal(false);
  });

  it('setCookieName reads name case-insensitively', () => {
    expect(setCookieName('ot=1; Path=/; Domain=x')).to.equal('ot');
  });

  it('rewriteSetCookie rewrites path and domain', () => {
    const inCookie = 'ot=1; Path=/abc.gif; Domain=analytics.ostr.io';
    const out = rewriteSetCookie(inCookie, {
      trackingId: 'abc',
      beaconPath: '/service/__a/abc.gif',
      hostname: 'example.com'
    });
    expect(out).to.include('/service/__a/abc.gif');
    expect(out).to.include('example.com');
    expect(out).to.not.include('analytics.ostr.io');
  });
});
