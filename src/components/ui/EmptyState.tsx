import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon && <div className="mb-4 text-navy-dim">{icon}</div>}
      <h3 className="font-serif text-xl text-navy mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-navy-dim max-w-md mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
