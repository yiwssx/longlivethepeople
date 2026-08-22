import type { MessagePage, MessagePayload, MessageRecord } from './types';

const API_PATH = '/api/v1/messages';
export const PAGE_SIZE = 50;

export class ApiError extends Error {
  status: number;
  retryAfter: string | null;

  constructor(status: number, retryAfter: string | null = null) {
    super(`HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const isMessageRecord = (value: unknown): value is MessageRecord => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MessageRecord>;
  return typeof item.id === 'string'
    && typeof item.codename === 'string'
    && typeof item.affiliation === 'string'
    && typeof item.message === 'string'
    && typeof item.createdAt === 'string';
};

const isMessagePage = (value: unknown): value is MessagePage => {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<MessagePage>;
  return Array.isArray(page.data)
    && page.data.every(isMessageRecord)
    && Boolean(page.pagination)
    && typeof page.pagination?.hasMore === 'boolean'
    && (page.pagination?.nextCursor === null || typeof page.pagination?.nextCursor === 'string');
};

export async function getMessages(before: string | null = null): Promise<MessagePage> {
  const url = new URL(API_PATH, window.location.origin);
  url.searchParams.set('limit', String(PAGE_SIZE));
  if (before) url.searchParams.set('before', before);

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new ApiError(response.status, response.headers.get('Retry-After'));

  const body: unknown = await response.json();
  if (!isMessagePage(body)) throw new ApiError(502);
  return body;
}

export async function createMessage(payload: MessagePayload): Promise<MessageRecord> {
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new ApiError(response.status, response.headers.get('Retry-After'));

  const body: unknown = await response.json();
  if (!isMessageRecord(body)) throw new ApiError(502);
  return body;
}
