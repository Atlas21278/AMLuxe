'use client'

import { useState, useEffect } from 'react'

export default function AbonnementsPage() {
  const [montant, setMontant] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.abonnementMensuel) setMontant(data.abonnementMensuel)
        setLoading(false)
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cle: 'abonnementMensuel', valeur: montant || '0' }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Abonnements fournisseurs</h1>
          <p className="text-sm text-white/40 mt-1">Coûts fixes mensuels à déduire du bénéfice dans les statistiques</p>
        </div>

        <div className="bg-[#13131c] border border-white/5 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Abonnement mensuel fournisseur</p>
              <p className="text-xs text-white/40 mt-1">
                Ce montant sera multiplié par le nombre de mois d&apos;activité et déduit du bénéfice total dans la page Statistiques.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="skeleton h-10 w-48 rounded-xl" />
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Montant mensuel (€)
                </label>
                <div className="relative w-48">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-8 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">€</span>
                </div>
                <p className="text-xs text-white/25 mt-2">
                  Exemple : 50 € si vous payez 50 €/mois pour l&apos;accès à votre fournisseur
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enregistré
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 px-4 py-3 bg-white/3 border border-white/5 rounded-xl flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/30 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-white/35 leading-relaxed">
            Le calcul dans les statistiques : <span className="text-white/60">mois d&apos;activité × montant mensuel</span>.
            Les mois d&apos;activité sont comptés depuis le premier achat enregistré jusqu&apos;au mois en cours.
          </p>
        </div>
      </div>
    </div>
  )
}
