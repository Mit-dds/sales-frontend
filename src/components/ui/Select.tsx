import type { SelectHTMLAttributes } from 'react'
import { useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className = '',
  id: externalId,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = externalId || generatedId

  return (
    <div className="mb-3.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[10px] text-navy-light tracking-[1.6px] uppercase font-sans mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full bg-[#F8FAFF] border border-border rounded-md
          text-navy px-3.5 py-2.5 text-[13px] font-sans
          outline-none cursor-pointer transition-colors
          focus:border-blue
          ${error ? 'border-red' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-red">{error}</p>
      )}
    </div>
  )
}
