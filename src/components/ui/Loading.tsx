import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

const spinnerSizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

export function Loading({ message, size = 'md' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className={`${spinnerSizes[size]} animate-spin text-gold`} />
      {message && (
        <p className={`${textSizes[size]} text-navy-light`}>{message}</p>
      )}
    </div>
  )
}
