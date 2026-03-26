'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const sizeClass = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ title, onClose, children, footer, size = 'md' }: ModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // T-073 — détecter s'il y a du contenu à scroller
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const check = () => {
      setShowScrollHint(el.scrollHeight > el.clientHeight + 20 && el.scrollTop < el.scrollHeight - el.clientHeight - 20)
    }
    check()
    el.addEventListener('scroll', check)
    const obs = new ResizeObserver(check)
    obs.observe(el)
    return () => { el.removeEventListener('scroll', check); obs.disconnect() }
  }, [])

  const content = (
    // T-066 — padding réduit sur mobile (p-3 au lieu de p-6)
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-50 w-screen h-screen flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — slide up sur mobile, centré sur desktop */}
      <div className={`relative z-10 w-full ${sizeClass[size]} bg-[#1a1a26] border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]`}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/8">
          <h2 id="modal-title" className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body scrollable avec indicateur */}
        <div ref={bodyRef} className="relative flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
          {children}
          {/* T-073 — dégradé indicateur de scroll */}
          {showScrollHint && (
            <div className="pointer-events-none sticky bottom-0 left-0 right-0 h-12 -mb-5 bg-gradient-to-t from-[#1a1a26] to-transparent flex items-end justify-center pb-2">
              <span className="text-white/30 text-xs">↓ défiler</span>
            </div>
          )}
        </div>

        {/* Footer optionnel */}
        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-white/8 bg-[#1a1a26] rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
