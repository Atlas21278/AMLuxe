'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'
import type { Article } from '@prisma/client'

const FormulaireVente = dynamic(() => import('@/components/articles/FormulaireVente'), { ssr: false })
const FormulaireArticle = dynamic(() => import('@/components/articles/FormulaireArticle'), { ssr: false })

type ArticleAvecCommande = Article & { commande: { fournisseur: string; id: number; frais: { id: number }[] } }

const FILTRES_STATUT = ['tous', 'En stock', 'En vente', 'Vendu', 'En retour', 'Endommagé', 'Litige']

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleAvecCommande[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreMarque, setFiltreMarque] = useState('toutes')
  const [filtrePlateforme, setFiltrePlateforme] = useState('toutes')
  const [venteArticle, setVenteArticle] = useState<Article | null>(null)
  const [editArticle, setEditArticle] = useState<Article | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setArticles(data)
    } catch {
      toast.error('Impossible de charger les articles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArticles() }, [])

  // T-075 — restaurer la position de scroll après navigation
  useEffect(() => {
    const saved = sessionStorage.getItem('scroll-articles')
    if (saved) {
      requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)))
      sessionStorage.removeItem('scroll-articles')
    }
    return () => {
      sessionStorage.setItem('scroll-articles', String(window.scrollY))
    }
  }, [])

  const marquesDisponibles = [...new Set(articles.map((a) => a.marque))].sort()
  const plateformesDisponibles = [...new Set(articles.filter((a) => a.plateforme).map((a) => a.plateforme!))].sort()

  const filtered = articles.filter((a) => {
    const matchSearch = `${a.marque} ${a.modele}`.toLowerCase().includes(search.toLowerCase())
    const matchStatut = filtreStatut === 'tous' || a.statut === filtreStatut
    const matchMarque = filtreMarque === 'toutes' || a.marque === filtreMarque
    const matchPlateforme = filtrePlateforme === 'toutes' || a.plateforme === filtrePlateforme
    return matchSearch && matchStatut && matchMarque && matchPlateforme
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '...')[]>((acc, p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  const stats = {
    total: articles.length,
    enStock: articles.filter((a) => a.statut === 'En stock').length,
    enVente: articles.filter((a) => a.statut === 'En vente').length,
    vendu: articles.filter((a) => a.statut === 'Vendu').length,
  }

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Articles</h1>
        <p className="text-sm text-white/40 mt-1">{stats.total} article{stats.total > 1 ? 's' : ''} au total</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'border-white/10' },
          { label: 'En stock', value: stats.enStock, color: 'border-slate-500/30' },
          { label: 'En vente', value: stats.enVente, color: 'border-purple-500/30' },
          { label: 'Vendus', value: stats.vendu, color: 'border-green-500/30' },
        ].map((s) => (
          <div key={s.label} className={`bg-white/3 border ${s.color} rounded-xl p-4`}>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Rechercher un article..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60" />
          </div>
          <select
            value={filtreMarque}
            onChange={(e) => { setFiltreMarque(e.target.value); setPage(1) }}
            style={{ backgroundColor: '#1a1a26', colorScheme: 'dark' }}
            className="w-full sm:w-auto appearance-none px-3 py-2.5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/60 cursor-pointer"
          >
            <option value="toutes">Toutes les marques</option>
            {marquesDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {plateformesDisponibles.length > 0 && (
            <select
              value={filtrePlateforme}
              onChange={(e) => { setFiltrePlateforme(e.target.value); setPage(1) }}
              style={{ backgroundColor: '#1a1a26', colorScheme: 'dark' }}
              className="w-full sm:w-auto appearance-none px-3 py-2.5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/60 cursor-pointer"
            >
              <option value="toutes">Toutes les plateformes</option>
              {plateformesDisponibles.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {(filtreMarque !== 'toutes' || filtrePlateforme !== 'toutes' || search) && (
            <button
              onClick={() => { setFiltreMarque('toutes'); setFiltrePlateforme('toutes'); setSearch(''); setPage(1) }}
              className="w-full sm:w-auto px-3 py-2.5 text-xs text-white/40 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
        {/* T-072 : scroll horizontal sur mobile pour les 7 statuts */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1 w-max sm:w-fit">
            {FILTRES_STATUT.map((f) => (
              <button
                key={f}
                onClick={() => { setFiltreStatut(f); setPage(1) }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filtreStatut === f ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}
              >
                {f === 'tous' ? 'Tous' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-32 ml-2" />
                <div className="skeleton h-4 w-16 ml-4" />
                <div className="skeleton h-5 w-18 rounded-full ml-4" />
                <div className="skeleton h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-sm">Aucun article trouvé</div>
        ) : (
          <>
          {/* Mobile: cards */}
          <div className="sm:hidden divide-y divide-white/5">
            {paginated.map((article) => {
              const marge = article.prixVenteReel
                ? ((article.prixVenteReel - (article.fraisVente ?? 0) - article.prixAchat) / article.prixAchat * 100).toFixed(0)
                : null
              return (
                <div key={article.id} className="px-4 py-3.5 active:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <p className="font-medium text-white text-sm">{article.marque} {article.modele}</p>
                      {article.refFournisseur && <p className="text-xs text-white/35">{article.refFournisseur}</p>}
                    </div>
                    <Badge statut={article.statut} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span>{article.etat}</span>
                      <span>·</span>
                      <span className="text-white/60 font-medium">{article.prixAchat.toFixed(2)} €</span>
                      {article.prixVenteReel && (
                        <>
                          <span>→</span>
                          <span className="text-white font-medium">{article.prixVenteReel.toFixed(2)} €</span>
                          {marge && <span className={Number(marge) >= 0 ? 'text-green-400' : 'text-red-400'}>{Number(marge) >= 0 ? '+' : ''}{marge}%</span>}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditArticle(article)}
                        className="p-1.5 rounded transition-colors text-white/25 hover:text-white hover:bg-white/10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {article.statut !== 'Vendu' && (
                        <button
                          onClick={() => article.commande.frais.length > 0 ? setVenteArticle(article) : toast.error('Ajoutez d\'abord les frais & taxes sur la commande')}
                          className={`p-1.5 rounded transition-colors ${article.commande.frais.length === 0 ? 'text-white/20 hover:text-amber-400 hover:bg-amber-500/10' : 'hover:bg-green-500/10 text-white/40 hover:text-green-400'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <th className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider">Article</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider">Commande</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider">État</th>
                <th className="text-right px-4 py-3 text-xs text-white/40 uppercase tracking-wider">Achat</th>
                <th className="text-right px-4 py-3 text-xs text-white/40 uppercase tracking-wider">Vente</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider">Statut</th>
                <th className="text-right px-4 py-3 text-xs text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((article) => {
                const marge = article.prixVenteReel
                  ? ((article.prixVenteReel - (article.fraisVente ?? 0) - article.prixAchat) / article.prixAchat * 100).toFixed(0)
                  : null
                return (
                  <tr key={article.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-white">{article.marque} {article.modele}</p>
                      {article.refFournisseur && <p className="text-xs text-white/35">{article.refFournisseur}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/commandes/${article.commandeId}`} className="text-white/60 hover:text-purple-400 transition-colors text-xs">
                        {article.commande.fournisseur}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-white/50 text-xs">{article.etat}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-white">{article.prixAchat.toFixed(2)} €</td>
                    <td className="px-4 py-3.5 text-right">
                      {article.prixVenteReel ? (
                        <div>
                          <p className="font-medium text-white">{article.prixVenteReel.toFixed(2)} €</p>
                          {marge && (
                            <p className={`text-xs ${Number(marge) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {Number(marge) >= 0 ? '+' : ''}{marge}%
                            </p>
                          )}
                        </div>
                      ) : article.prixVente ? (
                        <p className="text-white/50">{article.prixVente.toFixed(2)} €</p>
                      ) : <span className="text-white/25">—</span>}
                    </td>
                    <td className="px-4 py-3.5"><Badge statut={article.statut} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditArticle(article)}
                          className="p-1.5 rounded hover:bg-white/10 text-white/25 hover:text-white transition-colors"
                          title="Modifier l'article"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {article.statut !== 'Vendu' && (
                          <button
                            onClick={() => article.commande.frais.length > 0 ? setVenteArticle(article) : toast.error('Ajoutez d\'abord les frais & taxes sur la commande')}
                            className={`p-1.5 rounded transition-colors ${article.commande.frais.length === 0 ? 'text-white/20 hover:text-amber-400 hover:bg-amber-500/10' : 'hover:bg-green-500/10 text-white/40 hover:text-green-400'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <Link href={`/commandes/${article.commandeId}`} className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Voir la commande">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 gap-2">
          <p className="text-xs text-white/30 shrink-0">{filtered.length} article{filtered.length > 1 ? 's' : ''} — p.{page}/{totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-sm text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-sm text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">‹</button>
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="min-w-[36px] flex items-center justify-center text-xs text-white/20">…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)} className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === p ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>{p}</button>
              )
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-sm text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-sm text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">»</button>
          </div>
        </div>
      )}

      {editArticle && (
        <Modal title="Modifier l'article" onClose={() => setEditArticle(null)}>
          <FormulaireArticle commandeId={editArticle.commandeId} article={editArticle} onClose={() => { setEditArticle(null); fetchArticles() }} />
        </Modal>
      )}

      {venteArticle && (
        <Modal title="Vente / Mise en vente" onClose={() => setVenteArticle(null)}>
          <FormulaireVente article={venteArticle} onClose={() => { setVenteArticle(null); fetchArticles() }} />
        </Modal>
      )}

    </div>
  )
}
