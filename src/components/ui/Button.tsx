import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-linear-to-br from-[#C9A84C] to-[#E4C97A] text-navy hover:brightness-105',
  secondary:
    'bg-navy text-white hover:bg-[#2a3350]',
  outline:
    'bg-transparent text-navy-light border border-border hover:bg-surface',
  ghost:
    'bg-transparent text-navy-light hover:bg-surface border border-transparent',
  danger:
    'bg-linear-to-br from-red to-[#E74C3C] text-white hover:brightness-105',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-[5px] text-[11px]',
  md: 'px-6 py-[11px] text-[13px]',
  lg: 'px-7 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-md font-bold
        transition-all duration-150 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
