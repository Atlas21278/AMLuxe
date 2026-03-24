'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface SidebarProps {
  onClose?: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/commandes',
    label: 'Commandes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: '/articles',
    label: 'Articles',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    href: '/statistiques',
    label: 'Statistiques',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/objectifs',
    label: 'Objectifs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: '/export',
    label: 'Export',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
]

const settingsItems = [
  {
    href: '/parametres/utilisateurs',
    label: 'Utilisateurs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/parametres/abonnements',
    label: 'Abonnements',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: '/parametres/audit',
    label: 'Journal audit',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
]

export default function Sidebar({ onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleNav = () => {
    if (onClose) onClose()
  }

  return (
    <aside className={`h-full flex flex-col bg-[#13131c] border-r border-white/5 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo + toggle */}
      <div className={`border-b border-white/5 flex items-center ${collapsed ? 'px-3 py-5 justify-center' : 'px-4 py-5 justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              AM
            </div>
            <div>
              <p className="font-semibold text-white text-sm tracking-wide">AMLuxe</p>
              <p className="text-xs text-white/40">Gestion achat/revente</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
            AM
          </div>
        )}

        {/* Bouton fermer mobile */}
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Fermer le menu"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Bouton collapse desktop */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
          aria-label={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
          title={collapsed ? 'Étendre' : 'Réduire'}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">Menu</p>
          )}
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = mounted && !!pathname && (
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              )
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNav}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-purple-400' : 'text-white/40'}`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        {item.label}
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">Paramètres</p>
          )}
          <ul className="space-y-1">
            {settingsItems.map((item) => {
              const isActive = mounted && !!pathname && pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNav}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-purple-400' : 'text-white/40'}`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        {item.label}
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Footer avec déconnexion */}
      <div className={`px-2 py-4 border-t border-white/5 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={collapsed ? 'Se déconnecter' : undefined}
          className={`flex items-center gap-3 rounded-lg text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'p-2 justify-center w-full' : 'px-3 py-2.5 w-full'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && 'Se déconnecter'}
        </button>
        {!collapsed && <p className="px-3 text-xs text-white/20">v1.0.0</p>}
      </div>
    </aside>
  )
}
