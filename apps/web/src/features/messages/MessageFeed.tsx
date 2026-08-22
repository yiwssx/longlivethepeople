import { useEffect, useRef } from 'react';
import type { MessageRecord } from './types';

type MessageFeedProps = {
  messages: MessageRecord[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => Promise<void>;
};

export default function MessageFeed({ messages, hasMore, loading, loadMore }: MessageFeedProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return undefined;

    if (!('IntersectionObserver' in window)) {
      void loadMore();
      return undefined;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: '700px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading]);

  return (
    <section className="feed-section">
      <div className="section-heading feed-heading">
        <div>
          <p className="eyebrow">ผู้ไว้อาลัย::สังกัด</p>
          <h2>ข้อความไว้อาลัย</h2>
        </div>
      </div>

      <div id="messages" className="message-feed" aria-live="polite">
        {messages.map((message) => (
          <article className="message-card" data-message-id={message.id} key={message.id}>
            <p className="message-meta">{message.codename}::{message.affiliation}</p>
            <p className="message-text">{message.message}</p>
          </article>
        ))}
        <div id="feed-sentinel" className="feed-sentinel" ref={sentinelRef} aria-hidden="true" />
      </div>
    </section>
  );
}
