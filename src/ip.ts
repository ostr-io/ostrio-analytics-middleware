import type { IncomingMessage } from 'node:http';

export const defaultResolveClientIp = (req: IncomingMessage): string | false => {
  const { headers, socket } = req;
  if (typeof headers['cf-ray'] === 'string' && typeof headers['cf-connecting-ip'] === 'string') {
    return headers['cf-connecting-ip'];
  }
  return socket?.remoteAddress || false;
};
