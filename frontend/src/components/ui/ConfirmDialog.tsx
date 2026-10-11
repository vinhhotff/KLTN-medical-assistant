import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Field, Textarea } from './Field';

interface ReasonConfig {
  label: string;
  placeholder?: string;
  minLength?: number;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger' | 'warning';
  /** When set, the dialog asks for a reason and validates its minimum length. */
  reason?: ReasonConfig;
  onConfirm: (reason: string) => Promise<void> | void;
  onCancel: () => void;
}

/** Replacement for window.confirm / window.prompt. Disables itself while onConfirm runs. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Quay lại',
  tone = 'primary',
  reason,
  onConfirm,
  onCancel,
}) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setText('');
      setTouched(false);
      setBusy(false);
    }
  }, [open]);

  const min = reason?.minLength ?? 1;
  const trimmed = text.trim();
  const reasonError =
    reason && trimmed.length < min
      ? trimmed.length === 0
        ? `Vui lòng nhập ${reason.label.toLowerCase()}.`
        : `Cần ít nhất ${min} ký tự (hiện có ${trimmed.length}).`
      : null;

  const handleConfirm = async () => {
    setTouched(true);
    if (reasonError) return;
    try {
      setBusy(true);
      await onConfirm(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={handleConfirm} loading={busy} disabledReason={reasonError}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <div className="text-sm text-slate-600 leading-relaxed">{message}</div>}
      {reason && (
        <Field
          label={reason.label}
          htmlFor="confirm-reason"
          required
          className="mt-3"
          error={touched ? reasonError : null}
          hint={min > 1 ? `Tối thiểu ${min} ký tự · hiện có ${trimmed.length}` : undefined}
        >
          <Textarea
            id="confirm-reason"
            data-autofocus
            rows={3}
            value={text}
            invalid={touched && Boolean(reasonError)}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={reason.placeholder}
            disabled={busy}
          />
        </Field>
      )}
    </Modal>
  );
};
