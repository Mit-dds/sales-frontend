import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/ui/Sidebar'
import { Header } from '@/components/ui/Header'
import { SidebarProvider } from '@/app/providers/SidebarProvider'

export function ProtectedLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-surface text-navy font-sans">
        <Header />
        <div className="flex h-[calc(100vh-58px)] overflow-hidden">
          <Sidebar />
          <main className="flex-1 px-4 md:px-6 lg:px-10 py-4 md:py-6 lg:py-8 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
