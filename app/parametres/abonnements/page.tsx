'use client'

import { useState, useEffect, useRef } from 'react'

interface AbonnementMensuel {
  id: number
  mois: string
  montant: number
}

interface MoisRow {
  mois: string       // "YYYY-MM"
  label: string      // "Mars 2026"
  montant: number
  saved: boolean
  saving: boolean
  estMoisCourant: boolean
  estFutur: boolean
}

function formatMois(mois: string) {
  const [year, month] = mois.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function getMoisRange(debut: string): string[] {
  const now = new Date()
  const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const mois: string[] = []
  const [dy, dm] = debut.split('-').map(Number)
  let y = dy, m = dm
  while (true) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    mois.push(key)
    if (key === moisCourant) break
    m++
    if (m > 12) { m = 1; y++ }
    if (mois.length > 60) break // sécurité
  }
  return mois
}

export default function AbonnementsPage() {
  const [rows, setRows] = useState<MoisRow[]>([])
  const [loading, setLoading] = useState(true)
  const [debutMois, setDebutMois] = useState('')
  const savingRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/abonnements').then((r) => r.ok ? r.json() : []),
      fetch('/api/articles').then((r) => r.ok ? r.json() : []),
    ]).then(([abonnements, articles]: [AbonnementMensuel[], { createdAt: string }[]]) => {
      const now = new Date()
      const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Trouver le premier mois d'activité
      const dates = articles.map((a) => a.createdAt).filter(Boolean)
      let debut = moisCourant
      if (dates.length > 0) {
        const earliest = new Date(Math.min(...dates.map((d) => new Date(d).getTime())))
        debut = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}`
      }
      setDebutMois(debut)

      const range = getMoisRange(debut)
      const map: Record<string, number> = {}
      for (const a of abonnements) map[a.mois] = a.montant

      setRows(range.reverse().map((mois) => ({
        mois,
        label: formatMois(mois),
        montant: map[mois] ?? 0,
        saved: mois in map,
        saving: false,
        estMoisCourant: mois === moisCourant,
        estFutur: mois > moisCourant,
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleBlur = async (mois: string, valeur: string) => {
    if (savingRef.current[mois]) return
    savingRef.current[mois] = true

    setRows((prev) => prev.map((r) => r.mois === mois ? { ...r, saving: true } : r))

    await fetch('/api/abonnements', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mois, montant: Number(valeur) || 0 }),
    })

    setRows((prev) => prev.map((r) => r.mois === mois ? { ...r, saving: false, saved: true } : r))
    savingRef.current[mois] = false
  }

  const handleChange = (mois: string, valeur: string) => {
    setRows((prev) => prev.map((r) => r.mois === mois ? { ...r, montant: Number(valeur) || 0, saved: false } : r))
  }

  const totalAnnee = rows
    .filter((r) => r.mois.startsWith(String(new Date().getFullYear())))
    .reduce((sum, r) => sum + r.montant, 0)

  const totalGlobal = rows.reduce((sum, r) => sum + r.montant, 0)

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Abonnements fournisseurs</h1>
          <p className="text-sm text-white/40 mt-1">Saisissez le montant payé chaque mois — déduit automatiquement du bénéfice dans les statistiques</p>
        </div>

        {/* Totaux */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/3 border border-white/5 rounded-xl p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Cette année</p>
              <p className="text-xl font-bold text-white">{totalAnnee.toFixed(2)} €</p>
            </div>
            <div className="bg-white/3 border border-white/5 rounded-xl p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total cumulé</p>
              <p className="text-xl font-bold text-purple-400">{totalGlobal.toFixed(2)} €</p>
            </div>
          </div>
        )}

        <div className="bg-[#13131c] border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton h-8 w-32 rounded-lg" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">
              Aucun article enregistré — les mois apparaîtront ici dès votre première commande
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Mois</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Montant payé</th>
                  <th className="px-6 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.mois} className={`border-b border-white/[0.03] ${row.estMoisCourant ? 'bg-purple-600/5' : 'hover:bg-white/[0.02]'} transition-colors`}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white capitalize">{row.label}</span>
                        {row.estMoisCourant && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            En cours
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={row.montant || ''}
                          placeholder="0.00"
                          onBlur={(e) => handleBlur(row.mois, e.target.value)}
                          onChange={(e) => handleChange(row.mois, e.target.value)}
                          className="w-28 text-right px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-white text-sm outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-colors placeholder-white/20"
                        />
                        <span className="text-white/30 text-sm">€</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right w-24">
                      {row.saving ? (
                        <span className="text-xs text-white/30">Enreg...</span>
                      ) : row.saved && row.montant > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-xs text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Enregistré
                        </span>
                      ) : !row.saved && row.montant === 0 ? (
                        <span className="text-xs text-white/20">Non renseigné</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-xs text-white/25 px-1">
          Les montants sont sauvegardés automatiquement quand vous quittez le champ.
        </p>
      </div>
    </div>
  )
}
