export interface RewriteSetCookieOptions {
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
  { beaconPath, hostname }: RewriteSetCookieOptions
): string => {
  const parts = cookie.split(';');
  const nameValue = parts.shift() || '';
  let hasPath = false;

  const attributes = parts.map((attribute) => {
    const path = /^(\s*path\s*=\s*)(.*)$/i.exec(attribute);
    if (path) {
      hasPath = true;
      return `${path[1]}${beaconPath}`;
    }

    const domain = /^(\s*domain\s*=\s*)(.*)$/i.exec(attribute);
    if (domain) {
      return `${domain[1]}${hostname}`;
    }

    return attribute;
  });

  if (!hasPath) {
    attributes.push(` Path=${beaconPath}`);
  }

  return [nameValue, ...attributes].join(';');
};
