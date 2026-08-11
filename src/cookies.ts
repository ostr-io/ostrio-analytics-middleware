export interface RewriteSetCookieOptions {
  trackingId: string;
  beaconPath: string;
  hostname: string;
}

export const filterCookies = (
  cookieHeader: string | undefined,
  allowedNames: Set<string>
): string | false => {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return false;
  }

  const kept: string[] = [];
  const parts = cookieHeader.split(';');
  for (const segment of parts) {
    const part = segment.trim();
    if (!part) {
      continue;
    }
    const eq = part.indexOf('=');
    const name = (eq === -1 ? part : part.slice(0, eq)).trim().toLowerCase();
    if (allowedNames.has(name)) {
      kept.push(part);
    }
  }
  return kept.length ? kept.join('; ') : false;
};

export const setCookieName = (setCookie: string): string => {
  const first = setCookie.split(';')[0] || '';
  const eq = first.indexOf('=');
  return (eq === -1 ? first : first.slice(0, eq)).trim().toLowerCase();
};

export const rewriteSetCookie = (
  cookie: string,
  { trackingId, beaconPath, hostname }: RewriteSetCookieOptions
): string => {
  return cookie
    .replace(`/${trackingId}.gif`, beaconPath)
    .replace(/analytics\.ostr\.io/gi, hostname);
};
