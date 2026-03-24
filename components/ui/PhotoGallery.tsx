'use client'

import { useEffect, useCallback } from 'react'

interface Props {
  photos: string[]
  index: number
  label?: string
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function PhotoGallery({ photos, index, label, onClose, onNavigate }: Props) {
  const prev = useCallback(() => onNavigate((index - 1 + photos.length) % photos.length), [index, photos.length, onNavigate])
  const next = useCallback(() => onNavigate((index + 1) % photos.length), [index, photos.length, onNavigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10" onClick={(e) => e.stopPropagation()}>
        <div>
          {label && <p className="text-white/80 font-medium text-sm">{label}</p>}
          <p className="text-white/35 text-xs">{index + 1} / {photos.length}</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div className="relative flex items-center justify-center w-full h-full px-16 py-20" onClick={(e) => e.stopPropagation()}>
        <img
          key={index}
          src={photos[index]}
          alt={`Photo ${index + 1}`}
          className="max-w-full max-h-full object-contain rounded-xl select-none"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.6)', animation: 'fadeIn 0.15s ease' }}
          draggable={false}
        />
      </div>

      {/* Arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {photos.length > 1 && (
        <div className="absolute bottom-5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  )
}
