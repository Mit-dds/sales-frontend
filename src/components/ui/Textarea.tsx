import type { TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({
  label,
  error,
  className = '',
  id: externalId,
  ...props
}: TextareaProps) {
  const generatedId = useId()
  const textareaId = externalId || generatedId

  return (
    <div className="mb-3.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-[10px] text-navy-light tracking-[1.6px] uppercase font-sans mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full bg-[#F8FAFF] border border-border rounded-lg
          text-navy px-3.5 py-2.5 text-sm font-sans
          outline-none resize-vertical min-h-[60px] transition-colors
          placeholder:text-navy-dim
          focus:border-gold focus:ring-1 focus:ring-gold/30
          ${error ? 'border-red focus:border-red focus:ring-red/30' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red">{error}</p>
      )}
    </div>
  )
}
