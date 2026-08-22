import { useCallback, useState } from 'react';
import ArchiveDialog, { type DialogState } from '../components/ArchiveDialog';
import MessageFeed from '../components/MessageFeed';
import MessageForm from '../components/MessageForm';
import { useMessages } from '../hooks/useMessages';

export default function MemorialPage() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const handleLoadFailure = useCallback(() => {
    setDialog({
      title: 'ไม่สามารถโหลดข้อความได้',
      text: 'ระบบฐานข้อมูลอาจไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
    });
  }, []);

  const {
    messages,
    hasMore,
    loading,
    loadMore,
    prependMessage,
  } = useMessages({ onLoadFailure: handleLoadFailure });

  return (
    <>
      <main className="page-shell">
        <section className="hero-card">
          <div className="hero-media">
            <img
              className="hero-image"
              src="/assets/img/longlivethepeople.jpg"
              alt="Long Live the People"
              fetchPriority="high"
            />
          </div>
        </section>

        <section className="compose-card">
          <MessageForm onCreated={prependMessage} openDialog={setDialog} />
        </section>

        <MessageFeed
          messages={messages}
          hasMore={hasMore}
          loading={loading}
          loadMore={loadMore}
        />
      </main>

      <footer className="site-footer">
        <span>Fuck</span>
        <span>Military Government</span>
      </footer>

      <ArchiveDialog dialog={dialog} onDismiss={() => setDialog(null)} />
    </>
  );
}
