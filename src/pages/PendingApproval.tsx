import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { Card } from '@/components/ui'

export default function PendingApproval() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface font-sans">
      <Card padding="p-12" className="max-w-md text-center">
        <div className="text-5xl mb-4">!</div>
        <h2 className="font-serif text-2xl text-navy mb-2">Account Pending Approval</h2>
        <p className="text-[13px] text-navy-light mb-1">
          Your account <strong>{user?.email}</strong> has been created and is waiting for admin approval.
        </p>
        <p className="text-[13px] text-navy-light mb-8">
          Please contact your administrator to activate your account.
        </p>
        <button
          onClick={handleSignOut}
          className="text-xs text-navy-light border border-border rounded-md px-5 py-2.5 bg-transparent cursor-pointer hover:bg-surface transition-colors"
        >
          Sign Out
        </button>
      </Card>
    </div>
  )
}
