import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  detail?: string
  confirmLabel?: string
  confirmColor?: 'danger' | 'primary'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title: _title,
  message,
  detail,
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span className="text-base font-semibold text-navy">{message}</span>}
      size="sm"
    >
      {detail && <p className="text-[13px] text-navy-light mb-4">{detail}</p>}
      <div className="flex justify-end gap-2.5">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant={confirmColor === 'danger' ? 'danger' : 'primary'}
          size="sm"
          onClick={() => { onConfirm(); onClose() }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
