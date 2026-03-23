'use client'

import { detecterTransporteur } from '@/lib/tracking'

export default function TrackingWidget({ numero }: { numero: string }) {
  const transporteur = detecterTransporteur(numero)

  return (
    <div className="mt-2 rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12h4" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white">{transporteur.nom}</span>
          <a
            href={transporteur.urlSuivi(numero)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-white/35 hover:text-purple-400 transition-colors truncate block"
          >
            {numero}
          </a>
        </div>

        <a
          href={transporteur.urlSuivi(numero)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          title="Suivre sur le site du transporteur"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </div>
  )
}
