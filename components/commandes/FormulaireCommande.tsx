'use client'

import { useState, useTransition } from 'react'

interface ArticleRow {
  marque: string
  modele: string
  prixAchat: string
  etat: string
  refFournisseur: string
}

interface Props {
  commande?: {
    id: number
    fournisseur: string
    date: Date
    statut: string
    tracking: string | null
    notes: string | null
  }
  onClose: () => void
}

const STATUTS = ['En préparation', 'En livraison', 'Reçue']
const ETATS = ['Neuf', 'Très bon état', 'Bon état', 'Satisfaisant']

const articleVide = (): ArticleRow => ({
  marque: '',
  modele: '',
  prixAchat: '',
  etat: 'Très bon état',
  refFournisseur: '',
})

export default function FormulaireCommande({ commande, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const isEdit = !!commande

  const [form, setForm] = useState({
    fournisseur: commande?.fournisseur ?? '',
    date: commande ? new Date(commande.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    statut: commande?.statut ?? 'En préparation',
    tracking: commande?.tracking ?? '',
    notes: commande?.notes ?? '',
  })

  const [articles, setArticles] = useState<ArticleRow[]>([articleVide()])

  const updateArticle = (index: number, field: keyof ArticleRow, value: string) => {
    setArticles((prev) => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
  }

  const ajouterArticle = () => setArticles((prev) => [...prev, articleVide()])

  const supprimerArticle = (index: number) => {
    if (articles.length === 1) {
      setArticles([articleVide()])
    } else {
      setArticles((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      if (isEdit) {
        await fetch(`/api/commandes/${commande.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        onClose()
      } else {
        // Filtre les lignes vides (sans marque ni modèle)
        const articlesValides = articles.filter((a) => a.marque.trim() && a.modele.trim())
        await fetch('/api/commandes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, articles: articlesValides }),
        })
        onClose()
      }
    })
  }

  const inputClass = "w-full bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Infos commande */}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Fournisseur *</label>
        <input
          type="text"
          required
          placeholder="Nom du fournisseur"
          value={form.fournisseur}
          onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Date *</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Statut *</label>
          <select
            value={form.statut}
            onChange={(e) => setForm({ ...form, statut: e.target.value })}
            className={inputClass}
          >
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Numéro de tracking</label>
        <input
          type="text"
          placeholder="Ex: 1Z999AA10123456784"
          value={form.tracking}
          onChange={(e) => setForm({ ...form, tracking: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Notes</label>
        <textarea
          rows={2}
          placeholder="Notes internes..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Section articles — uniquement à la création */}
      {!isEdit && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">Articles</p>
              <p className="text-xs text-white/35 mt-0.5">Ajoutez les articles de cette commande (optionnel)</p>
            </div>
            <button
              type="button"
              onClick={ajouterArticle}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une ligne
            </button>
          </div>

          <div className="space-y-2">
            {articles.map((article, index) => (
              <div key={index} className="bg-[#0f0f18] border border-white/8 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-white/30 w-5 shrink-0">#{index + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Marque"
                      value={article.marque}
                      onChange={(e) => updateArticle(index, 'marque', e.target.value)}
                      className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Modèle"
                      value={article.modele}
                      onChange={(e) => updateArticle(index, 'modele', e.target.value)}
                      className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => supprimerArticle(index)}
                    className="p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-7">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Prix achat (€)"
                    value={article.prixAchat}
                    onChange={(e) => updateArticle(index, 'prixAchat', e.target.value)}
                    className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-colors"
                  />
                  <select
                    value={article.etat}
                    onChange={(e) => updateArticle(index, 'etat', e.target.value)}
                    className="bg-[#0f0f18] border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500/60 transition-colors"
                  >
                    {ETATS.map((et) => <option key={et} value={et}>{et}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Réf. fournisseur"
                    value={article.refFournisseur}
                    onChange={(e) => updateArticle(index, 'refFournisseur', e.target.value)}
                    className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>

          {articles.some((a) => a.marque.trim() || a.modele.trim()) && (
            <p className="text-xs text-white/30 mt-2">
              {articles.filter((a) => a.marque.trim() && a.modele.trim()).length} article(s) seront créés
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
        >
          {isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer la commande'}
        </button>
      </div>
    </form>
  )
}
