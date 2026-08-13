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
      beaconPath: '/service/__a/abc.gif',
      hostname: 'example.com'
    });
    expect(out).to.include('/service/__a/abc.gif');
    expect(out).to.include('example.com');
    expect(out).to.not.include('analytics.ostr.io');
  });

  it('scopes cookies to beacon path and does not rewrite cookie values', () => {
    const out = rewriteSetCookie('ot=analytics.ostr.io; Path=/; Domain=analytics.ostr.io', {
      beaconPath: '/service/__a/abc.gif',
      hostname: 'example.com'
    });
    expect(out).to.equal('ot=analytics.ostr.io; Path=/service/__a/abc.gif; Domain=example.com');
  });

  it('rewrites any Set-Cookie Domain to the configured hostname', () => {
    const out = rewriteSetCookie('ot=1; Path=/; Domain=self-hosted.example', {
      beaconPath: '/service/__a/abc.gif',
      hostname: 'app.example'
    });
    expect(out).to.equal('ot=1; Path=/service/__a/abc.gif; Domain=app.example');
  });
});
