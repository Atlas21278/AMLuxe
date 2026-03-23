'use client'

import { useState, useEffect } from 'react'
import type { ResultatTracking } from '@/lib/tracking'

const STATUT_COLORS: Record<string, string> = {
  'Livré': 'text-green-400 bg-green-500/10 border-green-500/30',
  'Livré (non confirmé)': 'text-green-400 bg-green-500/10 border-green-500/30',
  'En transit': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'Pris en charge': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'En attente': 'text-white/40 bg-white/5 border-white/10',
  'Retour expéditeur': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Problème': 'text-red-400 bg-red-500/10 border-red-500/30',
  'Expiré': 'text-white/30 bg-white/5 border-white/10',
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

export default function TrackingWidget({ numero }: { numero: string }) {
  const [data, setData] = useState<ResultatTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/tracking/${encodeURIComponent(numero)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [numero])

  const statut = data?.statut ?? ''
  const colorClass = STATUT_COLORS[statut] ?? 'text-white/40 bg-white/5 border-white/10'

  return (
    <div className="mt-2 rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icone transporteur */}
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12h4" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-2.5 w-40 bg-white/5 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">{data?.transporteur.nom ?? 'Transporteur inconnu'}</span>
                {statut && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
                    {statut}
                  </span>
                )}
              </div>
              <a
                href={data?.transporteur.urlSuivi(numero) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-white/35 hover:text-purple-400 transition-colors truncate block"
              >
                {numero}
              </a>
              {data?.derniereMaj && (
                <p className="text-xs text-white/25 mt-0.5">Mis à jour {formatDate(data.derniereMaj)}</p>
              )}
            </>
          )}
        </div>

        {/* Bouton détails */}
        {!loading && data && data.etapes.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            title={expanded ? 'Masquer les étapes' : 'Voir les étapes'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Timeline des étapes */}
      {expanded && data && data.etapes.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3 space-y-3">
          {data.etapes.map((etape, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${i === 0 ? 'bg-purple-400' : 'bg-white/20'}`} />
                {i < data.etapes.length - 1 && <div className="w-px flex-1 bg-white/8 mt-1" />}
              </div>
              <div className="pb-3 flex-1 min-w-0">
                <p className={`text-xs font-medium ${i === 0 ? 'text-white' : 'text-white/50'}`}>{etape.statut}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {etape.lieu && <span className="text-xs text-white/30">{etape.lieu}</span>}
                  {etape.date && <span className="text-xs text-white/20">{formatDate(etape.date)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message si API non configurée */}
      {!loading && data?.erreur && !data.etapes.length && (
        <div className="border-t border-white/5 px-4 py-2">
          <p className="text-xs text-white/25">{data.erreur === 'Clé API 17TRACK manquante (TRACK17_API_KEY)' ? 'Ajoute TRACK17_API_KEY dans les variables Railway pour voir le statut en temps réel.' : data.erreur}</p>
        </div>
      )}
    </div>
  )
}
