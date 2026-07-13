import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

export function PublicRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (user) {
    // Redirect authenticated users to their respective home pages
    return <Navigate to={user.role === 'admin' ? '/projects' : '/offers'} replace />
  }

  return <Outlet />
}
