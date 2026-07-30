import { useNavigate } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useSidebar } from '@/app/providers/SidebarProvider'
import { usersService } from '@/services/users.service'
import { Avatar } from './Avatar'

export function Header() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { toggle } = useSidebar()
  if (!user) return null

  const pendingCount = usersService.getAll().filter((u) => !u.approved && u.role === 'agent').length
  const showBell = user.role === 'admin' && pendingCount > 0

  return (
    <header className="h-[58px] bg-white border-b border-border shadow-[0_2px_8px_rgba(30,60,120,0.08)] flex items-center justify-between px-2 sm:px-3 md:px-5 sticky top-0 z-[100]">
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 min-w-0">
        <button onClick={toggle} className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-surface cursor-pointer text-navy-dim shrink-0">
          <Menu className="h-5 w-5" />
        </button>
        <div className="font-serif text-base sm:text-lg md:text-xl font-bold text-gold whitespace-nowrap">Reportage</div>
        <div className="hidden sm:block text-[10px] text-navy-dim tracking-[2px] uppercase whitespace-nowrap">SALES PLATFORM</div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
        {showBell && (
          <button
            onClick={() => navigate('/users')}
            className="relative p-1.5 sm:p-2 rounded-lg hover:bg-surface cursor-pointer text-navy-dim"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 bg-orange text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {pendingCount}
            </span>
          </button>
        )}
        {user.role === 'admin' && (
          <span className="text-[9px] bg-orange-dim text-orange border border-[rgba(200,100,10,0.3)] rounded px-2 py-0.5 font-sans hidden xs:block">ADMIN</span>
        )}
        <Avatar photo={user.photo} name={user.name} size={32} />
        <span className="hidden sm:block text-[13px] text-navy max-w-[80px] md:max-w-[120px] truncate">{user.name}</span>
        <button
          onClick={signOut}
          className="text-xs text-navy-light border border-border rounded-md px-1.5 sm:px-2 md:px-3 py-1.5 bg-transparent cursor-pointer hover:bg-surface transition-colors whitespace-nowrap"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
