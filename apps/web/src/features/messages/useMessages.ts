import { useCallback, useEffect, useRef, useState } from 'react';
import { getMessages } from './api';
import { acquireMessageSocket, releaseMessageSocket } from './socket';
import type { MessageRecord } from './types';

const HEALING_REFRESH_MS = 30_000;

type UseMessagesOptions = {
  onLoadFailure: () => void;
};

export function useMessages({ onLoadFailure }: UseMessagesOptions) {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const idsRef = useRef(new Set<string>());
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);

  const prependMessage = useCallback((message: MessageRecord) => {
    if (idsRef.current.has(message.id)) return;
    idsRef.current.add(message.id);
    setMessages((current) => [message, ...current]);
  }, []);

  const appendMessages = useCallback((items: MessageRecord[]) => {
    const fresh = items.filter((message) => {
      if (idsRef.current.has(message.id)) return false;
      idsRef.current.add(message.id);
      return true;
    });

    if (fresh.length > 0) {
      setMessages((current) => [...current, ...fresh]);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const page = await getMessages(nextCursorRef.current);
      appendMessages(page.data);
      nextCursorRef.current = page.pagination.nextCursor;
      hasMoreRef.current = page.pagination.hasMore;
      setHasMore(page.pagination.hasMore);
    } catch {
      hasMoreRef.current = false;
      setHasMore(false);
      onLoadFailure();
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [appendMessages, onLoadFailure]);

  const refreshLatest = useCallback(async () => {
    if (document.hidden) return;

    try {
      const page = await getMessages();
      const fresh = page.data.filter((message) => {
        if (idsRef.current.has(message.id)) return false;
        idsRef.current.add(message.id);
        return true;
      });

      if (fresh.length > 0) {
        setMessages((current) => [...fresh, ...current]);
      }
    } catch {
      // The periodic refresh only repairs missed realtime events.
    }
  }, []);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    const socket = acquireMessageSocket();
    const handleConnect = () => void refreshLatest();

    socket.on('message', prependMessage);
    socket.on('connect', handleConnect);

    if (socket.connected) {
      void refreshLatest();
    } else if (!socket.active) {
      socket.connect();
    }

    const refreshTimer = window.setInterval(() => void refreshLatest(), HEALING_REFRESH_MS);

    return () => {
      window.clearInterval(refreshTimer);
      socket.off('message', prependMessage);
      socket.off('connect', handleConnect);
      releaseMessageSocket();
    };
  }, [prependMessage, refreshLatest]);

  return {
    messages,
    hasMore,
    loading,
    loadMore,
    prependMessage,
  };
}
