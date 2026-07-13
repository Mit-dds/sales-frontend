import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { usersService } from '@/services/users.service'
import { Avatar } from './Avatar'

export function Header() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  if (!user) return null

  const pendingCount = usersService.getAll().filter((u) => !u.approved && u.role === 'agent').length
  const showBell = user.role === 'admin' && pendingCount > 0

  return (
    <header className="h-[58px] bg-white border-b border-border shadow-[0_2px_8px_rgba(30,60,120,0.08)] flex items-center justify-between px-5 sticky top-0 z-[100]">
      <div className="flex items-center gap-3">
        <div className="font-serif text-xl font-bold text-gold">Reportage</div>
        <div className="text-[10px] text-navy-dim tracking-[2px] uppercase">SALES PLATFORM</div>
      </div>
      <div className="flex items-center gap-3">
        {showBell && (
          <button
            onClick={() => navigate('/users')}
            className="relative p-2 rounded-lg hover:bg-surface cursor-pointer text-navy-dim"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 bg-orange text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {pendingCount}
            </span>
          </button>
        )}
        {user.role === 'admin' && (
          <span className="text-[9px] bg-orange-dim text-orange border border-[rgba(200,100,10,0.3)] rounded px-2 py-0.5 font-mono">ADMIN</span>
        )}
        <Avatar photo={user.photo} name={user.name} size={32} />
        <span className="text-[13px] text-navy">{user.name}</span>
        <button
          onClick={signOut}
          className="text-xs text-navy-light border border-border rounded-md px-3 py-1.5 bg-transparent cursor-pointer hover:bg-surface transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
