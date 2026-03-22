'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onClose: () => void
  duration?: number
}

export default function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), duration - 400)
    const closeTimer = setTimeout(onClose, duration)
    return () => { clearTimeout(exitTimer); clearTimeout(closeTimer) }
  }, [onClose, duration])

  return (
    <div
      className="fixed top-6 left-1/2 z-[200] pointer-events-none"
      style={{
        transform: 'translateX(-50%)',
        animation: exiting
          ? 'toastExit 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
          : 'toastEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      }}
    >
      {/* Carte */}
      <div className="relative flex items-center gap-3.5 bg-[#18182a]/95 backdrop-blur-2xl border border-amber-500/25 rounded-2xl px-5 py-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] min-w-[300px] max-w-sm overflow-hidden">

        {/* Lueur ambiante */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent pointer-events-none" />

        {/* Icône avec ripple */}
        <div className="relative shrink-0 w-9 h-9 flex items-center justify-center">
          {/* Ripple */}
          <span
            className="absolute inset-0 rounded-full bg-amber-500/20"
            style={{ animation: 'toastIconRipple 1.6s cubic-bezier(0,0,0.2,1) infinite' }}
          />
          {/* Fond icône */}
          <span className="absolute inset-0 rounded-full bg-amber-500/15" />
          {/* Icône */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="relative w-4.5 h-4.5 text-amber-400"
            style={{ animation: 'toastIconBeat 1.6s ease-in-out infinite' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        {/* Message */}
        <p className="relative text-sm font-medium text-white/90 leading-snug">{message}</p>
      </div>

      {/* Barre de progression */}
      <div className="mx-3 mt-1.5 h-[2px] bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400/50 rounded-full origin-left"
          style={{ animation: `toastProgress ${duration}ms linear forwards` }}
        />
      </div>
    </div>
  )
}
