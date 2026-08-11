import type { IncomingMessage } from 'node:http';

export const parseRequestUrl = (req: IncomingMessage): { pathname: string; search: string } => {
  const raw = req.url || '/';
  const u = new URL(raw, 'http://localhost');
  return { pathname: u.pathname, search: u.search };
};
