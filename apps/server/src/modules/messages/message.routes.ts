import express, { type NextFunction, type Request, type Response } from 'express';
import config from '../../config/index.ts';
import { handleApiError } from '../../http/errors.ts';
import { sendApiError } from '../../http/response.ts';
import { createRateLimit } from '../../middleware/rate-limit.ts';
import metrics from '../../observability/metrics.ts';
import messageService from './message.service.ts';
import { normalizeMessagePayload, parsePagination } from './message.validation.ts';

const router = express.Router();

const onRateLimit = (req: Request, res: Response) => {
  metrics.increment('rateLimitedTotal');
  return sendApiError(res, {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Too many requests; retry after the advertised delay',
    requestId: req.id,
  });
};

const messageReadRateLimit = createRateLimit({
  windowMs: config.messages.readRateLimitWindowMs,
  max: config.messages.readRateLimitMax,
  onLimit: onRateLimit,
});

const messageWriteRateLimit = createRateLimit({
  windowMs: config.messages.rateLimitWindowMs,
  max: config.messages.rateLimitMax,
  onLimit: onRateLimit,
});

router.get('/messages', messageReadRateLimit, async (req, res) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    if (!pagination) {
      return sendApiError(res, {
        status: 400,
        code: 'INVALID_PAGINATION',
        message: 'limit or before cursor is invalid',
        requestId: req.id,
      });
    }

    return res.status(200).json(await messageService.getMessages(pagination));
  } catch (error) {
    return handleApiError(error, req, res, { event: 'message_api_error' });
  }
});

router.post(
  '/messages',
  messageWriteRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.is('application/json')) {
      return sendApiError(res, {
        status: 415,
        code: 'JSON_REQUIRED',
        message: 'POST /messages accepts application/json only',
        requestId: req.id,
      });
    }
    return next();
  },
  express.json({ limit: config.http.bodyLimit }),
  async (req, res) => {
    try {
      const payload = normalizeMessagePayload(req.body);
      if (!payload) {
        return sendApiError(res, {
          status: 400,
          code: 'INVALID_MESSAGE',
          message: 'codename, affiliation, and message are required strings within their limits',
          requestId: req.id,
        });
      }

      return res.status(201).json(await messageService.createMessage(payload));
    } catch (error) {
      return handleApiError(error, req, res, { event: 'message_api_error' });
    }
  },
);

export default router;
