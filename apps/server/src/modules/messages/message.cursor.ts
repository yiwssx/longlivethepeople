import mongoose from 'mongoose';

export type MessageCursor = {
  createdAt: Date;
  id: mongoose.Types.ObjectId;
};

export const encodeCursor = ({ createdAt, id }: { createdAt: Date | string; id: unknown }): string => (
  Buffer.from(JSON.stringify({
    createdAt: new Date(createdAt).toISOString(),
    id: String(id),
  }), 'utf8').toString('base64url')
);

export const decodeCursor = (value: unknown): MessageCursor | null => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
    };
    const createdAt = new Date(String(parsed.createdAt));

    if (
      Number.isNaN(createdAt.getTime())
      || typeof parsed.id !== 'string'
      || !mongoose.Types.ObjectId.isValid(parsed.id)
    ) return null;

    return { createdAt, id: new mongoose.Types.ObjectId(parsed.id) };
  } catch {
    return null;
  }
};
