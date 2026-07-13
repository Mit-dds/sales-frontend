import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'gold'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-dim text-green border-[rgba(26,138,90,0.3)]',
  warning: 'bg-orange-dim text-orange border-[rgba(200,100,10,0.3)]',
  error: 'bg-red-dim text-red border-[rgba(192,57,43,0.3)]',
  info: 'bg-blue-dim text-blue border-[rgba(30,111,217,0.3)]',
  gold: 'bg-gold-dim text-gold border-[rgba(184,134,11,0.3)]',
}

export function Badge({ variant = 'gold', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono
        border ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
