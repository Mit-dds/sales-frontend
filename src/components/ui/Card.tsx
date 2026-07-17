import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  onClick?: () => void
  topBorderColor?: string
  padding?: string
}

export function Card({
  children,
  hover = false,
  onClick,
  topBorderColor,
  padding = 'p-4 md:p-6',
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white border border-border rounded-[10px] shadow-[0_2px_8px_rgba(30,60,120,0.06)]
        ${padding}
        ${hover ? 'transition-shadow hover:shadow-[0_4px_16px_rgba(30,60,120,0.1)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${topBorderColor ? `border-t-3` : ''}
        ${className}
      `}
      style={topBorderColor ? { borderTopColor: topBorderColor } : undefined}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
