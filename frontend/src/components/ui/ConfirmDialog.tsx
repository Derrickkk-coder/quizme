import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={loading}>
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600">{message}</p>
    </Modal>
  );
}
