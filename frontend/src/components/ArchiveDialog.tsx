import { useEffect } from 'react';

export type DialogState = {
  title: string;
  text: string;
  onClose?: () => void;
};

type ArchiveDialogProps = {
  dialog: DialogState | null;
  onDismiss: () => void;
};

export default function ArchiveDialog({ dialog, onDismiss }: ArchiveDialogProps) {
  const close = () => {
    if (!dialog) return;
    const afterClose = dialog.onClose;
    onDismiss();
    afterClose?.();
  };

  useEffect(() => {
    if (!dialog) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  if (!dialog) return null;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="archive-dialog" role="dialog" aria-modal="true" aria-labelledby="archive-dialog-title">
        <h2 id="archive-dialog-title">{dialog.title}</h2>
        <p>{dialog.text}</p>
        <button className="btn btn-primary" type="button" onClick={close} autoFocus>
          ปิดหน้าต่าง
        </button>
      </section>
    </div>
  );
}
