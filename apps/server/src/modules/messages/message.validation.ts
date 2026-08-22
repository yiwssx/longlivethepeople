import config from '../../config/index.ts';
import { decodeCursor, type MessageCursor } from './message.cursor.ts';
import type { MessagePayload } from './message.service.ts';

const parsePositiveInteger = (value: unknown, fallback: number): number | null => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parsePagination = (query: Record<string, unknown>): { limit: number; cursor: MessageCursor | null } | null => {
  const defaultLimit = Math.min(config.messages.defaultPageSize, config.messages.maxPageSize);
  const limit = parsePositiveInteger(query.limit, defaultLimit);
  if (limit === null || limit > config.messages.maxPageSize) return null;
  if (query.before === undefined) return { limit, cursor: null };
  const cursor = decodeCursor(query.before);
  return cursor ? { limit, cursor } : null;
};

export const normalizeMessagePayload = (body: unknown): MessagePayload | null => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const rules: Array<[keyof MessagePayload, number]> = [
    ['codename', config.messages.codenameMaxLength],
    ['affiliation', config.messages.affiliationMaxLength],
    ['message', config.messages.messageMaxLength],
  ];
  const payload = {} as MessagePayload;

  for (const [field, maxLength] of rules) {
    const value = record[field];
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (normalized.length === 0 || normalized.length > maxLength) return null;
    payload[field] = normalized;
  }

  return payload;
};
