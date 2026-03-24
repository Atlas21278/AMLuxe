'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import TrackingWidget from '@/components/ui/TrackingWidget'
import FormulaireArticle from '@/components/articles/FormulaireArticle'
import FormulaireVente from '@/components/articles/FormulaireVente'
import FormulaireFrais from '@/components/commandes/FormulaireFrais'
import type { Commande, Article, Frais } from '@prisma/client'

type CommandeDetail = Commande & { articles: Article[]; frais: Frais[] }

export default function CommandeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const [commande, setCommande] = useState<CommandeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalArticle, setModalArticle] = useState(false)
  const [modalFrais, setModalFrais] = useState(false)
  const [editArticle, setEditArticle] = useState<Article | null>(null)
  const [venteArticle, setVenteArticle] = useState<Article | null>(null)
  const [confirmDeleteArticleId, setConfirmDeleteArticleId] = useState<number | null>(null)

  const fetchCommande = useCallback(async () => {
    try {
      const res = await fetch(`/api/commandes/${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCommande(data)
      setError(false)
    } catch {
      setError(true)
      toast.error('Impossible de charger la commande')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchCommande() }, [fetchCommande])

  const handleDeleteArticle = async (articleId: number) => {
    if (confirmDeleteArticleId !== articleId) {
      setConfirmDeleteArticleId(articleId)
      return
    }
    setConfirmDeleteArticleId(null)
    const res = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur lors de la suppression'); return }
    toast.success('Article supprimé')
    fetchCommande()
  }

  const handleDeleteFrais = async (fraisId: number) => {
    const res = await fetch(`/api/frais/${fraisId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur lors de la suppression'); return }
    fetchCommande()
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-enter p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="skeleton w-9 h-9 rounded-lg" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-7 w-28" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
          </div>
          <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error || !commande) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/40 text-sm mb-4">Impossible de charger cette commande.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={fetchCommande} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors">Réessayer</button>
          <Link href="/commandes" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm text-white transition-colors">Retour aux commandes</Link>
        </div>
      </div>
    )
  }

  const totalAchat = commande.articles.reduce((acc, a) => acc + a.prixAchat, 0)
  const totalFrais = commande.frais.reduce((acc, f) => acc + f.montant, 0)
  const totalVentes = commande.articles
    .filter((a) => a.prixVenteReel)
    .reduce((acc, a) => acc + (a.prixVenteReel ?? 0) - (a.fraisVente ?? 0), 0)
  const benefice = totalVentes - totalAchat - totalFrais

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      {/* Header avec breadcrumb */}
      <div className="sticky top-0 z-10 bg-[#0f0f13] flex items-center gap-4 mb-6 sm:mb-8 py-3 sm:py-0 sm:static sm:bg-transparent -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-white/5 sm:border-0">
        <Link href="/commandes" className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          {/* Breadcrumb */}
          <p className="text-xs text-white/30 mb-0.5">
            <Link href="/commandes" className="hover:text-white/60 transition-colors">Commandes</Link>
            <span className="mx-1.5">›</span>
            <span className="text-white/50">{commande.fournisseur}</span>
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{commande.fournisseur}</h1>
            <Badge statut={commande.statut} />
          </div>
          <p className="text-sm text-white/40 mt-0.5">
            {new Date(commande.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {commande.tracking && (
            <TrackingWidget numero={commande.tracking} />
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Total achat', value: `${totalAchat.toFixed(2)} €`, sub: `${commande.articles.length} articles` },
          { label: 'Frais', value: `${totalFrais.toFixed(2)} €`, sub: `${commande.frais.length} ligne(s)` },
          { label: 'Revenus ventes', value: `${totalVentes.toFixed(2)} €`, sub: 'net de frais' },
          { label: 'Bénéfice', value: `${benefice.toFixed(2)} €`, sub: benefice >= 0 ? '✓ Positif' : '⚠ Négatif', highlight: true },
        ].map((card) => (
          <div key={card.label} className={`bg-white/3 border ${card.highlight ? (benefice >= 0 ? 'border-green-500/30' : 'border-red-500/30') : 'border-white/5'} rounded-xl p-4`}>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.highlight ? (benefice >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>{card.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {commande.frais.length === 0 && commande.articles.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-amber-400">Ajoutez les frais & taxes avant de pouvoir enregistrer une vente</p>
          <button onClick={() => setModalFrais(true)} className="ml-auto shrink-0 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs text-amber-400 font-medium transition-colors">
            Ajouter des frais
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Articles */}
        <div className="lg:col-span-2 bg-white/3 border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Articles</h2>
            <button onClick={() => setModalArticle(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter
            </button>
          </div>
          {commande.articles.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/30">Aucun article</div>
          ) : (
            <>
              {/* Mobile: cards articles */}
              <div className="sm:hidden divide-y divide-white/5">
                {commande.articles.map((article) => {
                  const marge = article.prixVenteReel
                    ? article.prixVenteReel - (article.fraisVente ?? 0) - article.prixAchat
                    : null
                  return (
                    <div key={article.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-white text-sm">{article.marque} {article.modele}</p>
                          {article.refFournisseur && <p className="text-xs text-white/35">{article.refFournisseur}</p>}
                        </div>
                        <Badge statut={article.statut} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span>{article.etat}</span>
                          <span>·</span>
                          <span className="text-white font-medium">{article.prixAchat.toFixed(2)} €</span>
                          {marge !== null && (
                            <span className={marge >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                              {marge >= 0 ? '+' : ''}{marge.toFixed(0)} €
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {article.statut !== 'Vendu' && (
                            <button
                              onClick={() => commande.frais.length > 0
                                ? setVenteArticle(article)
                                : toast.error('Ajoutez d\'abord les frais & taxes de cette commande')}
                              className={`p-2 rounded transition-colors ${commande.frais.length === 0 ? 'text-white/20 hover:text-amber-400 hover:bg-amber-500/10' : 'text-white/40 hover:text-green-400 hover:bg-green-500/10'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => setEditArticle(article)} className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {confirmDeleteArticleId === article.id ? (
                            <button onClick={() => handleDeleteArticle(article.id)} className="px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-colors">
                              Confirmer
                            </button>
                          ) : (
                            <button onClick={() => handleDeleteArticle(article.id)} className="p-2 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Desktop: table */}
              <table className="hidden sm:table w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2.5 text-xs text-white/40">Article</th>
                    <th className="text-left px-4 py-2.5 text-xs text-white/40">État</th>
                    <th className="text-right px-4 py-2.5 text-xs text-white/40">Achat</th>
                    <th className="text-right px-4 py-2.5 text-xs text-white/40">Marge</th>
                    <th className="text-left px-4 py-2.5 text-xs text-white/40">Statut</th>
                    <th className="text-right px-4 py-2.5 text-xs text-white/40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commande.articles.map((article) => {
                    const marge = article.prixVenteReel
                      ? article.prixVenteReel - (article.fraisVente ?? 0) - article.prixAchat
                      : null
                    return (
                      <tr key={article.id} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{article.marque} {article.modele}</p>
                          {article.refFournisseur && <p className="text-xs text-white/35">{article.refFournisseur}</p>}
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{article.etat}</td>
                        <td className="px-4 py-3 text-right font-medium text-white">{article.prixAchat.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-right text-xs font-semibold">
                          {marge !== null ? (
                            <span className={marge >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {marge >= 0 ? '+' : ''}{marge.toFixed(0)} €
                            </span>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-4 py-3"><Badge statut={article.statut} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {article.statut !== 'Vendu' && (
                              <button
                                onClick={() => commande.frais.length > 0
                                  ? setVenteArticle(article)
                                  : toast.error('Ajoutez d\'abord les frais & taxes de cette commande')}
                                className={`p-1.5 rounded transition-colors ${commande.frais.length === 0 ? 'text-white/20 hover:text-amber-400 hover:bg-amber-500/10' : 'text-white/40 hover:text-green-400 hover:bg-green-500/10'}`}
                                title="Vendre"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            <button onClick={() => setEditArticle(article)} className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Modifier">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {confirmDeleteArticleId === article.id ? (
                              <button onClick={() => handleDeleteArticle(article.id)} className="px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-colors">
                                Confirmer
                              </button>
                            ) : (
                              <button onClick={() => handleDeleteArticle(article.id)} className="p-1.5 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors" title="Supprimer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Frais */}
        <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Frais & taxes</h2>
            <button onClick={() => setModalFrais(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter
            </button>
          </div>
          {commande.frais.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/30">Aucun frais</div>
          ) : (
            <div className="divide-y divide-white/5">
              {commande.frais.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-white">{f.type}</p>
                    {f.description && <p className="text-xs text-white/35">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{f.montant.toFixed(2)} €</span>
                    <button onClick={() => handleDeleteFrais(f.id)} className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-white/3">
                <p className="text-sm font-semibold text-white">Total</p>
                <p className="text-sm font-bold text-white">{totalFrais.toFixed(2)} €</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalArticle && (
        <Modal title="Ajouter un article" onClose={() => setModalArticle(false)}>
          <FormulaireArticle commandeId={Number(id)} onClose={() => { setModalArticle(false); fetchCommande() }} />
        </Modal>
      )}
      {editArticle && (
        <Modal title="Modifier l'article" onClose={() => setEditArticle(null)}>
          <FormulaireArticle commandeId={Number(id)} article={editArticle} onClose={() => { setEditArticle(null); fetchCommande() }} />
        </Modal>
      )}
      {venteArticle && (
        <Modal title="Vente / Mise en vente" onClose={() => setVenteArticle(null)}>
          <FormulaireVente article={venteArticle} onClose={() => { setVenteArticle(null); fetchCommande() }} />
        </Modal>
      )}
      {modalFrais && (
        <Modal title="Ajouter des frais" onClose={() => setModalFrais(false)}>
          <FormulaireFrais commandeId={Number(id)} onClose={() => { setModalFrais(false); fetchCommande() }} />
        </Modal>
      )}
    </div>
  )
}
