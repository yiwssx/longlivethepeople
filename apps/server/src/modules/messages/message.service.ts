import type { QueryFilter } from 'mongoose';
import database from '../../infrastructure/database.ts';
import realtime from '../../infrastructure/realtime.ts';
import metrics from '../../observability/metrics.ts';
import { DatabaseUnavailableError, ValidationAppError } from '../../http/errors.ts';
import Message, { type MessageDocumentShape } from './message.model.ts';
import { encodeCursor, type MessageCursor } from './message.cursor.ts';

const DATABASE_WAIT_MS = 1000;

export type MessagePayload = {
  codename: string;
  affiliation: string;
  message: string;
};

export type PublicMessage = MessagePayload & {
  id: string;
  createdAt: string;
};

export const toPublicMessage = (message: {
  _id: unknown;
  codename: string;
  affiliation: string;
  message: string;
  createdAt: Date;
}): PublicMessage => ({
  id: String(message._id),
  codename: message.codename,
  affiliation: message.affiliation,
  message: message.message,
  createdAt: new Date(message.createdAt).toISOString(),
});

const buildCursorFilter = (cursor: MessageCursor | null): QueryFilter<MessageDocumentShape> => {
  const visibilityFilter: QueryFilter<MessageDocumentShape> = {
    status: { $in: ['published', null] },
  };

  if (!cursor) return visibilityFilter;

  return {
    ...visibilityFilter,
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ],
  };
};

export const getMessages = async ({ limit, cursor }: { limit: number; cursor: MessageCursor | null }) => {
  if (!await database.waitForConnection(DATABASE_WAIT_MS)) throw new DatabaseUnavailableError();

  const documents = await Message.find(buildCursorFilter(cursor))
    .select(['codename', 'affiliation', 'message', 'createdAt'])
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = documents.length > limit;
  const visibleDocuments = hasMore ? documents.slice(0, limit) : documents;
  const data = visibleDocuments.map((message) => toPublicMessage({
    _id: message._id,
    codename: message.codename,
    affiliation: message.affiliation,
    message: message.message,
    createdAt: message.createdAt,
  }));
  const last = visibleDocuments.at(-1);
  const nextCursor = hasMore && last
    ? encodeCursor({ createdAt: last.createdAt, id: last._id })
    : null;

  return { data, pagination: { limit, hasMore, nextCursor } };
};

export const createMessage = async (payload: MessagePayload): Promise<PublicMessage> => {
  if (!await database.waitForConnection(DATABASE_WAIT_MS)) throw new DatabaseUnavailableError();

  try {
    const saved = await Message.create({ ...payload, status: 'published' });
    const publicMessage = toPublicMessage(saved);
    metrics.increment('messagesCreatedTotal');
    realtime.emit('message', publicMessage);
    return publicMessage;
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      throw new ValidationAppError('Message fields failed validation');
    }
    throw error;
  }
};

export default { getMessages, createMessage, toPublicMessage };
