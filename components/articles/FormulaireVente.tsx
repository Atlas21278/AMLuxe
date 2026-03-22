'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { Article } from '@prisma/client'
import { PLATEFORMES } from '@/constants/statuts'

interface Props {
  article: Article
  onClose: () => void
}

export default function FormulaireVente({ article, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'vente' | 'vendu'>(article.statut === 'En vente' ? 'vendu' : 'vente')

  const [form, setForm] = useState({
    prixVente: article.prixVente?.toString() ?? '',
    plateforme: article.plateforme ?? 'Vinted',
    prixVenteReel: article.prixVenteReel?.toString() ?? '',
    fraisVente: article.fraisVente?.toString() ?? '',
    dateVente: article.dateVente
      ? new Date(article.dateVente).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const data: Record<string, unknown> = {
        marque: article.marque,
        modele: article.modele,
        prixAchat: article.prixAchat,
        etat: article.etat,
        refFournisseur: article.refFournisseur,
        notes: article.notes,
        commandeId: article.commandeId,
      }

      if (mode === 'vente') {
        data.statut = 'En vente'
        data.prixVente = form.prixVente
        data.plateforme = form.plateforme
      } else {
        data.statut = 'Vendu'
        data.prixVente = form.prixVente || article.prixVente
        data.plateforme = form.plateforme || article.plateforme
        data.prixVenteReel = form.prixVenteReel
        data.fraisVente = form.fraisVente
        data.dateVente = form.dateVente
      }

      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        toast.error('Erreur lors de la mise à jour')
        return
      }
      toast.success(mode === 'vente' ? 'Article mis en vente' : 'Vente enregistrée')
      onClose()
    })
  }

  const inputClass = "w-full bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30"

  return (
    <div>
      <div className="mb-4 p-3 bg-white/3 rounded-lg">
        <p className="text-sm font-medium text-white">{article.marque} {article.modele}</p>
        <p className="text-xs text-white/40 mt-0.5">Achat : {article.prixAchat.toFixed(2)} €</p>
      </div>

      {/* Toggle mode — masqué si déjà en vente (on passe direct à "vendu") */}
      {article.statut !== 'En vente' && (
        <div className="flex gap-2 mb-5">
          {(['vente', 'vendu'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === m
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-400'
                  : 'border-white/10 text-white/50 hover:bg-white/5'
              }`}
            >
              {m === 'vente' ? 'Mettre en vente' : 'Marquer comme vendu'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Prix {mode === 'vente' ? 'annoncé' : 'affiché'} (€)
            </label>
            <input
              type="number" step="0.01" min="0" placeholder="0.00"
              value={form.prixVente}
              onChange={(e) => setForm({ ...form, prixVente: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Plateforme *</label>
            <select required value={form.plateforme} onChange={(e) => setForm({ ...form, plateforme: e.target.value })} className={inputClass}>
              {PLATEFORMES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Champs vente finale — uniquement si mode "vendu" */}
        {mode === 'vendu' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Prix encaissé (€) *</label>
                <input
                  type="number" step="0.01" min="0" required placeholder="0.00"
                  value={form.prixVenteReel}
                  onChange={(e) => setForm({ ...form, prixVenteReel: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Frais de vente (€)</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.fraisVente}
                  onChange={(e) => setForm({ ...form, fraisVente: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Date de vente</label>
              <input type="date" value={form.dateVente} onChange={(e) => setForm({ ...form, dateVente: e.target.value })} className={inputClass} />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">Annuler</button>
          <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
            {isPending ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </form>
    </div>
  )
}
