'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'
import Sidebar from './Sidebar'
import NavigationProgress from './ui/NavigationProgress'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // desktop

  // T-078 — fermer la sidebar mobile automatiquement lors d'un changement de route
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Persister l'état collapsed en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setSidebarCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: { background: '#1a1a26', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' },
        }}
      />
      <NavigationProgress />

      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar mobile (fixed) */}
      <div className={`fixed inset-y-0 left-0 z-40 lg:hidden transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} collapsed={false} onToggleCollapse={() => {}} />
      </div>

      {/* Sidebar desktop (sticky) */}
      <div className={`hidden lg:flex sticky top-0 h-screen flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barre mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#13131c] border-b border-white/5 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-600 flex items-center justify-center text-white font-bold text-xs">AM</div>
            <span className="font-semibold text-white text-sm">AMLuxe</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
