import Modal from './Modal'
import Spinner from './Spinner'

interface ConfirmDialogProps {
  isOpen: boolean; onClose: () => void; onConfirm: () => void
  title?: string; message?: string; confirmLabel?: string
  variant?: 'danger' | 'warning'; loading?: boolean
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title = 'Confirm', message = 'Are you sure?',
  confirmLabel = 'Confirm', variant = 'danger', loading = false,
}: ConfirmDialogProps) {
  const confirmBg = variant === 'danger' ? 'var(--red-risk)' : 'var(--amber-warn)'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" footer={
      <>
        <button onClick={onClose} disabled={loading} className="btn btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} style={{
          background: confirmBg, border: 'none', borderRadius: 'var(--radius)', color: '#fff',
          padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading && <Spinner size="sm" />}
          {confirmLabel}
        </button>
      </>
    }>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  )
}
