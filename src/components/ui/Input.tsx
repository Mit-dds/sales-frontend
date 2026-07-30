import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className = '',
  id: externalId,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = externalId || generatedId

  return (
    <div className="mb-3.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] text-navy-light tracking-[1.6px] uppercase font-sans mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-dim">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full bg-[#F8FAFF] border border-border rounded-md
            text-navy px-3.5 py-2.5 text-[13px] font-sans
            outline-none box-border transition-colors
            placeholder:text-navy-dim
            focus:border-blue
            ${error ? 'border-red focus:border-red' : ''}
            ${icon ? 'pl-10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-[10px] text-navy-dim">{helperText}</p>
      )}
    </div>
  )
}
