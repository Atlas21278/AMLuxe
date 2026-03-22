'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { Article } from '@prisma/client'
import Combobox from '@/components/ui/Combobox'
import { MARQUES, getModeles } from '@/data/marques'
import { ETATS, STATUTS_ARTICLE } from '@/constants/statuts'

interface Props {
  commandeId: number
  article?: Article
  onClose: () => void
}

export default function FormulaireArticle({ commandeId, article, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const isEdit = !!article

  const [form, setForm] = useState({
    marque: article?.marque ?? '',
    modele: article?.modele ?? '',
    prixAchat: article?.prixAchat?.toString() ?? '',
    etat: article?.etat ?? 'Très bon état',
    refFournisseur: article?.refFournisseur ?? '',
    statut: article?.statut ?? 'En stock',
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
        body: JSON.stringify({ ...form, commandeId }),
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
      <div className="grid grid-cols-2 gap-3">
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
            options={getModeles(form.marque)}
            value={form.modele}
            onChange={(v) => setForm({ ...form, modele: v })}
            placeholder={form.marque ? 'Choisir un modèle...' : 'Sélectionnez une marque'}
            disabled={!form.marque}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
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
        <label className="block text-xs font-medium text-white/60 mb-1.5">Notes</label>
        <textarea rows={2} placeholder="Notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} resize-none`} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">Annuler</button>
        <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
          {isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : "Ajouter l'article"}
        </button>
      </div>
    </form>
  )
}
