import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={`
          ${sizeStyles[size]} w-full mx-4
          bg-white rounded-[10px] shadow-[0_2px_8px_rgba(30,60,120,0.06)]
          max-h-[90vh] flex flex-col
        `}
      >
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {title && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">{title}</div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-surface text-navy-dim cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
