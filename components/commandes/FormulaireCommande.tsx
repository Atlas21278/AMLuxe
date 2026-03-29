'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import Combobox from '@/components/ui/Combobox'
import { MARQUES, getModeles } from '@/data/marques'
import { STATUTS_COMMANDE, ETATS, TYPES_FRAIS } from '@/constants/statuts'

interface ArticleRow {
  marque: string
  modele: string
  prixAchat: string
  etat: string
  refFournisseur: string
}

interface FraisRow {
  type: string
  montant: string
  description: string
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
  initialArticles?: ArticleRow[]
  fournisseurs?: string[]
  onClose: () => void
}

const articleVide = (): ArticleRow => ({ marque: '', modele: '', prixAchat: '', etat: 'Très bon état', refFournisseur: '' })
const fraisVide = (): FraisRow => ({ type: 'Douane', montant: '', description: '' })

const inputClass = "w-full bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors"
const inputSmClass = "w-full bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-colors"

export default function FormulaireCommande({ commande, initialArticles, fournisseurs = [], onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const isEdit = !!commande

  const [form, setForm] = useState({
    fournisseur: commande?.fournisseur ?? '',
    date: commande ? new Date(commande.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    statut: commande?.statut ?? 'En préparation',
    tracking: commande?.tracking ?? '',
    notes: commande?.notes ?? '',
  })

  const [articles, setArticles] = useState<ArticleRow[]>(initialArticles ?? [articleVide()])
  const [frais, setFrais] = useState<FraisRow[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(!!(commande?.tracking || commande?.notes))
  const [focusNewArticle, setFocusNewArticle] = useState<number | null>(null)
  const forceCreateRef = useRef(false)
  const articlesEndRef = useRef<HTMLDivElement>(null)
  const prixRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus le champ prix de la nouvelle ligne (la marque est un Combobox, plus difficile à focus)
  useEffect(() => {
    if (focusNewArticle !== null) {
      prixRefs.current[focusNewArticle]?.focus()
      setFocusNewArticle(null)
    }
  }, [focusNewArticle, articles.length])

  const updateArticle = (index: number, field: keyof ArticleRow, value: string) => {
    setArticles((prev) => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
  }

  const ajouterArticle = () => {
    setArticles((prev) => [...prev, articleVide()])
    setTimeout(() => {
      articlesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      setFocusNewArticle(articles.length)
    }, 50)
  }

  const supprimerArticle = (index: number) => {
    if (articles.length === 1) setArticles([articleVide()])
    else setArticles((prev) => prev.filter((_, i) => i !== index))
  }

  const updateFrais = (index: number, field: keyof FraisRow, value: string) =>
    setFrais((prev) => prev.map((f, i) => i === index ? { ...f, [field]: value } : f))

  const ajouterFrais = () => setFrais((prev) => [...prev, fraisVide()])
  const supprimerFrais = (index: number) => setFrais((prev) => prev.filter((_, i) => i !== index))

  // Enter sur le dernier champ d'un article → nouvelle ligne
  const handleArticleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && index === articles.length - 1) {
      e.preventDefault()
      ajouterArticle()
    }
  }

  // Totaux live
  const totalArticles = articles.reduce((s, a) => s + (parseFloat(a.prixAchat) || 0), 0)
  const totalFrais = frais.reduce((s, f) => s + (parseFloat(f.montant) || 0), 0)
  const totalGeneral = totalArticles + totalFrais
  const articlesValides = articles.filter((a) => a.marque.trim() && a.modele.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      if (isEdit) {
        const res = await fetch(`/api/commandes/${commande.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) { toast.error('Erreur lors de la modification'); return }
        toast.success('Commande modifiée')
        onClose()
      } else {
        if (!forceCreateRef.current && form.fournisseur.trim()) {
          const checkRes = await fetch(`/api/commandes?search=${encodeURIComponent(form.fournisseur)}&page=1&limit=10`)
          if (checkRes.ok) {
            const { data } = await checkRes.json()
            const selectedDate = new Date(form.date)
            const nearby = (data ?? []).filter((c: { date: string; fournisseur: string }) => {
              const diff = Math.abs(new Date(c.date).getTime() - selectedDate.getTime())
              return diff <= 7 * 24 * 60 * 60 * 1000 && c.fournisseur.toLowerCase() === form.fournisseur.toLowerCase()
            })
            if (nearby.length > 0) {
              setDuplicateWarning(`Une commande "${nearby[0].fournisseur}" existe déjà le ${new Date(nearby[0].date).toLocaleDateString('fr-FR')}`)
              return
            }
          }
        }
        const fraisValides = frais.filter((f) => f.montant && Number(f.montant) > 0)
        const res = await fetch('/api/commandes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, articles: articlesValides, frais: fraisValides }),
        })
        if (!res.ok) { toast.error('Erreur lors de la création'); return }
        forceCreateRef.current = false
        toast.success('Commande créée')
        onClose()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Infos essentielles ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Fournisseur *</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Nom du fournisseur"
            value={form.fournisseur}
            onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
            className={inputClass}
            list="fournisseurs-suggestions"
            autoComplete="off"
          />
          {fournisseurs.length > 0 && (
            <datalist id="fournisseurs-suggestions">
              {fournisseurs.map((f) => <option key={f} value={f} />)}
            </datalist>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Date *</label>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Statut</label>
            <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className={inputClass} style={{ backgroundColor: '#0f0f18', colorScheme: 'dark' }}>
              {STATUTS_COMMANDE.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Infos supplémentaires (tracking + notes) — masquées par défaut */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {showAdvanced ? 'Masquer' : 'Tracking & notes'}
        </button>

        {showAdvanced && (
          <div className="space-y-3 pl-4 border-l border-white/8">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Numéro de tracking</label>
              <input type="text" placeholder="Ex: 1Z999AA10123456784" value={form.tracking} onChange={(e) => setForm({ ...form, tracking: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Notes</label>
              <textarea rows={2} placeholder="Notes internes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} resize-none`} />
            </div>
          </div>
        )}
      </div>

      {/* ── Articles (création seulement) ──────────────────────────── */}
      {!isEdit && (
        <>
          <div className="border-t border-white/6 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Articles</p>
                {articlesValides.length > 0 && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{articlesValides.length}</span>
                )}
              </div>
              <button
                type="button"
                onClick={ajouterArticle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/25 rounded-lg text-xs text-purple-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {articles.map((article, index) => (
                <div key={index} className={`rounded-xl border px-3 py-2.5 transition-colors ${article.marque ? 'border-white/10 bg-white/2' : 'border-white/6 bg-transparent'}`}>
                  {/* Ligne 1 : marque + modele + supprimer */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium text-white/20 w-4 shrink-0 text-center">{index + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Combobox
                        options={MARQUES}
                        value={article.marque}
                        onChange={(val) => { updateArticle(index, 'marque', val); updateArticle(index, 'modele', '') }}
                        placeholder="Marque"
                      />
                      <Combobox
                        options={getModeles(article.marque)}
                        value={article.modele}
                        onChange={(val) => updateArticle(index, 'modele', val)}
                        placeholder={article.marque ? 'Modèle' : '—'}
                        disabled={!article.marque}
                      />
                    </div>
                    <button type="button" onClick={() => supprimerArticle(index)} className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Ligne 2 : prix + état + ref */}
                  <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2 pl-6">
                    <div className="relative">
                      <input
                        ref={(el) => { prixRefs.current[index] = el }}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Prix achat"
                        value={article.prixAchat}
                        onChange={(e) => updateArticle(index, 'prixAchat', e.target.value)}
                        onKeyDown={(e) => handleArticleKeyDown(e, index)}
                        className={`${inputSmClass} pr-5`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 text-xs pointer-events-none">€</span>
                    </div>
                    <select
                      value={article.etat}
                      onChange={(e) => updateArticle(index, 'etat', e.target.value)}
                      className={inputSmClass}
                      style={{ backgroundColor: '#0f0f18', colorScheme: 'dark' }}
                    >
                      {ETATS.map((et) => <option key={et} value={et}>{et}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Réf / N° série"
                      value={article.refFournisseur}
                      onChange={(e) => updateArticle(index, 'refFournisseur', e.target.value)}
                      onKeyDown={(e) => handleArticleKeyDown(e, index)}
                      className={inputSmClass}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div ref={articlesEndRef} />
          </div>

          {/* ── Frais ──────────────────────────────────────────────── */}
          <div className="border-t border-white/6 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Frais & taxes</p>
              <button type="button" onClick={ajouterFrais} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg text-xs text-white/50 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>

            {frais.length === 0 ? (
              <p className="text-xs text-white/25 text-center py-2.5 border border-dashed border-white/8 rounded-lg">Ajoutez frais après la création si besoin</p>
            ) : (
              <div className="space-y-2">
                {frais.map((f, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                    <select value={f.type} onChange={(e) => updateFrais(index, 'type', e.target.value)} className={inputSmClass} style={{ backgroundColor: '#0f0f18', colorScheme: 'dark' }}>
                      {TYPES_FRAIS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="relative">
                      <input type="number" step="0.01" min="0" placeholder="Montant" value={f.montant} onChange={(e) => updateFrais(index, 'montant', e.target.value)} className={`${inputSmClass} pr-5`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 text-xs pointer-events-none">€</span>
                    </div>
                    <button type="button" onClick={() => supprimerFrais(index)} className="mt-1.5 p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Total live ─────────────────────────────────────────── */}
          {(totalGeneral > 0) && (
            <div className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
              <div className="flex items-center gap-4 text-xs text-white/40">
                {totalArticles > 0 && <span>{articlesValides.length} article{articlesValides.length > 1 ? 's' : ''} · {totalArticles.toFixed(2)} €</span>}
                {totalFrais > 0 && <span>Frais · {totalFrais.toFixed(2)} €</span>}
              </div>
              <div className="text-sm font-semibold text-white">
                Total <span className="text-purple-400 ml-1">{totalGeneral.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Alerte doublon ─────────────────────────────────────────── */}
      {duplicateWarning && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-amber-300 font-medium">Possible doublon</p>
            <p className="text-xs text-amber-400/80 mt-0.5">{duplicateWarning}</p>
          </div>
          <button type="submit" onClick={() => { forceCreateRef.current = true; setDuplicateWarning(null) }} className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0 mt-0.5">
            Créer quand même
          </button>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-[#1a1a26] pb-1 -mx-6 px-6 border-t border-white/5">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
          {isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer la commande'}
        </button>
      </div>
    </form>
  )
}
