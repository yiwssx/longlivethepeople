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
  if (!dialog) return null;

  const close = () => {
    const afterClose = dialog.onClose;
    onDismiss();
    afterClose?.();
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
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
