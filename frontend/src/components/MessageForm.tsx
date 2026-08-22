import { useRef, useState, type FormEvent } from 'react';
import { ApiError, createMessage } from '../lib/api';
import type { MessageRecord } from '../types/message';
import type { DialogState } from './ArchiveDialog';

type MessageFormProps = {
  onCreated: (message: MessageRecord) => void;
  openDialog: (dialog: DialogState) => void;
};

export default function MessageForm({ onCreated, openDialog }: MessageFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    const payload = {
      codename: String(data.get('codename') || '').trim(),
      affiliation: String(data.get('affiliation') || '').trim(),
      message: String(data.get('message') || '').trim(),
    };

    if (!payload.codename || !payload.affiliation || !payload.message) {
      openDialog({
        title: 'Warning!',
        text: 'กรุณากรอกข้อมูลให้ครบ',
      });
      return;
    }

    setSubmitting(true);

    try {
      const created = await createMessage(payload);
      onCreated(created);
      openDialog({
        title: 'Success!',
        text: 'ส่งข้อความเรียบร้อย',
        onClose: () => formRef.current?.reset(),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        openDialog({
          title: 'ส่งข้อความถี่เกินไป',
          text: 'กรุณารอสักครู่ก่อนส่งข้อความอีกครั้ง',
        });
      } else {
        openDialog({
          title: 'Fails!',
          text: 'ส่งข้อความไม่สำเร็จ',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} id="message-form" className="message-form" autoComplete="off" noValidate onSubmit={handleSubmit}>
      <div className="field-group">
        <textarea
          className="form-control message-input"
          id="message"
          name="message"
          rows={6}
          maxLength={2000}
          placeholder="ข้อความแสดงความไว้อาลัย"
          aria-label="ข้อความแสดงความไว้อาลัย"
          required
        />
      </div>

      <div className="form-grid">
        <div className="field-group">
          <input
            className="form-control"
            type="text"
            id="codename"
            name="codename"
            maxLength={80}
            placeholder="นามแฝง"
            aria-label="นามแฝง"
            required
          />
        </div>

        <div className="field-group">
          <input
            className="form-control"
            type="text"
            id="affiliation"
            name="affiliation"
            maxLength={120}
            placeholder="สังกัด"
            aria-label="สังกัด"
            required
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" id="send" type="submit" disabled={submitting}>
          ไว้อาลัย
        </button>
      </div>
    </form>
  );
}
