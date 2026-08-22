import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import metrics from '../observability/metrics.ts';

const shouldLog = () => process.env.NODE_ENV !== 'test';

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint();
  const requestId = randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    metrics.recordHttpStatus(res.statusCode);
    if (!shouldLog()) return;

    const durationNs = process.hrtime.bigint() - startedAt;
    const durationMs = Number(durationNs) / 1_000_000;
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : 'info',
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    }));
  });

  next();
};
