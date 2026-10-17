import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_REQUEST_ID = /^[\w-]{1,100}$/;

export function requestId(req: Request, res: Response, next: NextFunction) {
  const received = req.get('X-Request-Id');
  req.requestId = received && SAFE_REQUEST_ID.test(received) ? received : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
