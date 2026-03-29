'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import type { Article } from '@prisma/client'
import Combobox from '@/components/ui/Combobox'
import { MARQUES, getModelesGroupes } from '@/data/marques'
import { ETATS, STATUTS_ARTICLE, DEVISES } from '@/constants/statuts'

interface HistoriqueEntry {
  id: number
  champ: string
  ancienne: string | null
  nouvelle: string | null
  createdAt: string
}

const LABELS: Record<string, string> = {
  statut: 'Statut',
  prixAchat: "Prix d'achat",
  prixVente: 'Prix de vente',
  prixVenteReel: 'Prix vendu',
  fraisVente: 'Frais de vente',
  plateforme: 'Plateforme',
  etat: 'État',
  notes: 'Notes',
  devise: 'Devise',
}

interface Props {
  commandeId: number
  article?: Article
  onClose: () => void
}

type CommandeOption = { id: number; fournisseur: string; date: string }

export default function FormulaireArticle({ commandeId, article, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const isEdit = !!article
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([])
  const [showHistorique, setShowHistorique] = useState(false)
  const [showDeplacer, setShowDeplacer] = useState(false)
  const [commandesDisponibles, setCommandesDisponibles] = useState<CommandeOption[]>([])
  const [targetCommandeId, setTargetCommandeId] = useState<number>(commandeId)

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/articles/${article.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setHistorique)
      .catch(() => {})
  }, [isEdit, article?.id])

  useEffect(() => {
    if (!showDeplacer || commandesDisponibles.length > 0) return
    fetch('/api/commandes')
      .then((r) => r.ok ? r.json() : [])
      .then((data: CommandeOption[]) => setCommandesDisponibles(data))
      .catch(() => {})
  }, [showDeplacer, commandesDisponibles.length])

  const [form, setForm] = useState({
    marque: article?.marque ?? '',
    modele: article?.modele ?? '',
    prixAchat: article?.prixAchat?.toString() ?? '',
    etat: article?.etat ?? 'Très bon état',
    refFournisseur: article?.refFournisseur ?? '',
    statut: article?.statut ?? 'En stock',
    devise: (article as { devise?: string })?.devise ?? 'EUR',
    notes: article?.notes ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const url = isEdit ? `/api/articles/${article.id}` : '/api/articles'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, commandeId: targetCommandeId }),
      })
      if (!res.ok) {
        toast.error(isEdit ? 'Erreur lors de la modification' : "Erreur lors de l'ajout")
        return
      }
      toast.success(isEdit ? 'Article modifié' : 'Article ajouté')
      onClose()
    })
  }

  const inputClass = "w-full bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Marque *</label>
          <Combobox
            options={MARQUES}
            value={form.marque}
            onChange={(v) => setForm({ ...form, marque: v, modele: '' })}
            placeholder="Hermès, Chanel..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Modèle *</label>
          <Combobox
            groups={getModelesGroupes(form.marque)}
            value={form.modele}
            onChange={(v) => setForm({ ...form, modele: v })}
            placeholder={form.marque ? 'Choisir un modèle...' : 'Sélectionnez une marque'}
            disabled={!form.marque}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Prix d&apos;achat (€) *</label>
          <input type="number" step="0.01" min="0" required placeholder="0.00" value={form.prixAchat} onChange={(e) => setForm({ ...form, prixAchat: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">État *</label>
          <select value={form.etat} onChange={(e) => setForm({ ...form, etat: e.target.value })} className={inputClass}>
            {ETATS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Numéro de série</label>
          <input type="text" placeholder="N° de série" value={form.refFournisseur} onChange={(e) => setForm({ ...form, refFournisseur: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Statut</label>
          <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className={inputClass}>
            {STATUTS_ARTICLE.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Devise</label>
        <select value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })} className={inputClass}>
          {DEVISES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Notes</label>
        <textarea rows={2} placeholder="Notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} resize-none`} />
      </div>

      {isEdit && (
        <div className="pt-1 border-t border-white/5">
          <button
            type="button"
            onClick={() => setShowDeplacer((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${showDeplacer ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Déplacer vers une autre commande
          </button>
          {showDeplacer && (
            <div className="mt-2">
              <select
                value={targetCommandeId}
                onChange={(e) => setTargetCommandeId(Number(e.target.value))}
                className={inputClass}
              >
                {commandesDisponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fournisseur} — {new Date(c.date).toLocaleDateString('fr-FR')}
                    {c.id === commandeId ? ' (actuelle)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {isEdit && historique.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowHistorique((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${showHistorique ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Historique ({historique.length} modification{historique.length > 1 ? 's' : ''})
          </button>
          {showHistorique && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {historique.map((h) => (
                <div key={h.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-white/5">
                  <span className="text-white/30 shrink-0 tabular-nums">
                    {new Date(h.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    {' '}
                    {new Date(h.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-white/50 shrink-0">{LABELS[h.champ] ?? h.champ}</span>
                  <span className="text-red-400/70 line-through truncate max-w-[80px]">{h.ancienne || '—'}</span>
                  <span className="text-white/20">→</span>
                  <span className="text-green-400/80 truncate max-w-[80px]">{h.nouvelle || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">Annuler</button>
        <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
          {isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : "Ajouter l'article"}
        </button>
      </div>
    </form>
  )
}
