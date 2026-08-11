import type { IncomingMessage } from 'node:http';

export const defaultResolveClientIp = (req: IncomingMessage): string | false => {
  const { headers, socket } = req;
  if (headers['cf-ray'] && headers['cf-connecting-ip']) {
    return headers['cf-connecting-ip'] as string;
  }
  return socket?.remoteAddress || false;
};
