'use client'

import { useState, useEffect } from 'react'

interface AuditEntry {
  id: number
  action: string
  ressource: string
  cible: number | null
  details: string | null
  userEmail: string | null
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-400 bg-green-500/10 border-green-500/20',
  UPDATE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreRessource, setFiltreRessource] = useState('')

  useEffect(() => {
    const params = filtreRessource ? `?ressource=${filtreRessource}` : ''
    fetch(`/api/audit${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [filtreRessource])

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Journal d&apos;audit</h1>
        <p className="text-sm text-white/40 mt-1">Historique des actions effectuées sur l&apos;application</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'commande', 'article', 'frais', 'user'].map((r) => (
          <button
            key={r}
            onClick={() => setFiltreRessource(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtreRessource === r
                ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {r || 'Tout'}
          </button>
        ))}
      </div>

      <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-1.5">
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-32 ml-auto" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-12">Aucune entrée dans le journal</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Ressource</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white/40 tabular-nums whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${ACTION_COLORS[log.action] ?? 'text-white/50'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60 capitalize">{log.ressource}</td>
                    <td className="px-4 py-3 text-white/40 tabular-nums">{log.cible ?? '—'}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{log.userEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-white/30 text-xs max-w-xs truncate" title={log.details ?? ''}>
                      {log.details ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
