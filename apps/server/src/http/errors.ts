import type { Request, Response } from 'express';
import { sendApiError } from './response.ts';

export class AppError extends Error {
  status: number;
  code: string;
  expose: boolean;

  constructor(status: number, code: string, message: string, options: { cause?: unknown; expose?: boolean } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.expose = options.expose !== false;
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor() {
    super(503, 'DATABASE_UNAVAILABLE', 'Database is temporarily unavailable');
  }
}

export class ValidationAppError extends AppError {
  constructor(message = 'Request data is invalid') {
    super(400, 'VALIDATION_ERROR', message);
  }
}

type ErrorShape = Partial<AppError> & { type?: string };

const toErrorShape = (error: unknown): ErrorShape => (
  typeof error === 'object' && error !== null ? error as ErrorShape : {}
);

export const handleApiError = (
  error: unknown,
  req: Request,
  res: Response,
  { event = 'api_error', normalizeBodyParser = false } = {},
) => {
  const candidate = toErrorShape(error);
  const originalMessage = error instanceof Error ? error.message : 'Unknown error';
  let status = candidate.status || 500;
  let code = candidate.code || 'INTERNAL_ERROR';
  let message = candidate.expose === false ? undefined : originalMessage;

  if (normalizeBodyParser && candidate.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else if (normalizeBodyParser && candidate.type === 'entity.parse.failed') {
    status = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body contains malformed JSON';
  }

  if (status >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      event,
      requestId: req.id,
      code,
      message: originalMessage,
    }));
  }

  return sendApiError(res, { status, code, message, requestId: req.id });
};
