import type { Request } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

// Must run after requestId so log lines carry the same id as the response header.
export const makeRequestLogger = (logger: Logger) =>
  pinoHttp({
    logger,
    genReqId: (req) => (req as Request).requestId,
  });
