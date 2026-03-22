'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import FormulaireCommande from '@/components/commandes/FormulaireCommande'
import type { Commande, Article, Frais } from '@prisma/client'

type CommandeAvecRelations = Commande & { articles: Article[]; frais: Frais[] }

interface Props {
  commandes: CommandeAvecRelations[]
  onRefresh: () => void
}

type SortKey = 'fournisseur' | 'date' | 'totalAchat' | 'frais'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

const STATUTS_OPTIONS = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'En préparation', label: 'En préparation' },
  { value: 'En livraison', label: 'En livraison' },
  { value: 'Reçue', label: 'Reçue' },
]

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-flex flex-col gap-px">
      <svg viewBox="0 0 10 6" className={`w-2.5 h-2.5 ${active && dir === 'asc' ? 'text-purple-400' : 'text-white/20'}`} fill="currentColor"><path d="M5 0L10 6H0L5 0Z" /></svg>
      <svg viewBox="0 0 10 6" className={`w-2.5 h-2.5 ${active && dir === 'desc' ? 'text-purple-400' : 'text-white/20'}`} fill="currentColor"><path d="M5 6L0 0H10L5 6Z" /></svg>
    </span>
  )
}

export default function ListeCommandes({ commandes, onRefresh }: Props) {
  const router = useRouter()
  const [editCommande, setEditCommande] = useState<CommandeAvecRelations | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteSelection, setDeleteSelection] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selection, setSelection] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)

  const handleSort = (key: SortKey) => {
    setSortKey(key)
    setSortDir(sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')
    setPage(1)
  }

  const filtered = commandes
    .filter((c) => {
      const matchSearch = c.fournisseur.toLowerCase().includes(search.toLowerCase())
      const matchStatut = filtreStatut === 'tous' || c.statut === filtreStatut
      return matchSearch && matchStatut
    })
    .sort((a, b) => {
      let valA: string | number
      let valB: string | number
      if (sortKey === 'fournisseur') { valA = a.fournisseur.toLowerCase(); valB = b.fournisseur.toLowerCase() }
      else if (sortKey === 'date') { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime() }
      else if (sortKey === 'totalAchat') { valA = a.articles.reduce((s, x) => s + x.prixAchat, 0); valB = b.articles.reduce((s, x) => s + x.prixAchat, 0) }
      else { valA = a.frais.reduce((s, x) => s + x.montant, 0); valB = b.frais.reduce((s, x) => s + x.montant, 0) }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const allFilteredIds = filtered.map((c) => c.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selection.has(id))
  const someSelected = allFilteredIds.some((id) => selection.has(id))

  const toggleAll = () => {
    setSelection(allSelected ? new Set() : new Set(allFilteredIds))
  }

  const toggleOne = (id: number) => {
    setSelection((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDelete = () => {
    if (deleteId === null) return
    startTransition(async () => {
      await fetch(`/api/commandes/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      onRefresh()
    })
  }

  const handleDeleteSelection = () => {
    startTransition(async () => {
      await Promise.all([...selection].map((id) => fetch(`/api/commandes/${id}`, { method: 'DELETE' })))
      setSelection(new Set())
      setDeleteSelection(false)
      onRefresh()
    })
  }

  const th = "px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider select-none"
  const thSort = `${th} cursor-pointer hover:text-white/70 transition-colors`

  // Pages à afficher avec ellipsis
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '...')[]>((acc, p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30"
          />
        </div>

        <div className="relative">
          <select
            value={filtreStatut}
            onChange={(e) => { setFiltreStatut(e.target.value); setPage(1) }}
            style={{ backgroundColor: '#1a1a26', colorScheme: 'dark' }}
            className="appearance-none pl-3 pr-8 py-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/60 cursor-pointer"
          >
            {STATUTS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ backgroundColor: '#1a1a26' }}>{o.label}</option>
            ))}
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {selection.size > 0 && (
          <div className="ml-auto flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            <span className="text-sm text-red-400 font-medium">{selection.size} sélectionnée{selection.size > 1 ? 's' : ''}</span>
            <button
              onClick={() => setDeleteSelection(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 rounded-md text-xs font-medium text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </button>
            <button onClick={() => setSelection(new Set())} className="text-xs text-white/40 hover:text-white transition-colors">
              Désélectionner
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm">Aucune commande trouvée</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden divide-y divide-white/5">
            {paginated.map((commande) => {
              const totalAchat = commande.articles.reduce((s, a) => s + a.prixAchat, 0)
              const totalFrais = commande.frais.reduce((s, f) => s + f.montant, 0)
              return (
                <div
                  key={commande.id}
                  onClick={() => router.push(`/commandes/${commande.id}`)}
                  className="px-4 py-3.5 active:bg-white/5 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-medium text-white text-sm">{commande.fournisseur}</p>
                    <Badge statut={commande.statut} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
                    <span>{new Date(commande.date).toLocaleDateString('fr-FR')}</span>
                    <span>·</span>
                    <span>{commande.articles.length} article{commande.articles.length > 1 ? 's' : ''}</span>
                    {totalAchat > 0 && <><span>·</span><span className="text-white/60 font-medium">{totalAchat.toFixed(2)} €</span></>}
                    {totalFrais > 0 && <><span>·</span><span className="text-white/40">{totalFrais.toFixed(2)} € frais</span></>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-purple-500 cursor-pointer"
                    />
                  </th>
                  <th className={`text-left ${thSort}`} onClick={() => handleSort('fournisseur')}>
                    <span className="flex items-center">Fournisseur<SortIcon active={sortKey === 'fournisseur'} dir={sortDir} /></span>
                  </th>
                  <th className={`text-left ${thSort}`} onClick={() => handleSort('date')}>
                    <span className="flex items-center">Date<SortIcon active={sortKey === 'date'} dir={sortDir} /></span>
                  </th>
                  <th className={`text-left ${th}`}>Statut</th>
                  <th className={`text-right ${th}`}>Articles</th>
                  <th className={`text-right ${thSort}`} onClick={() => handleSort('totalAchat')}>
                    <span className="flex items-center justify-end">Total achat<SortIcon active={sortKey === 'totalAchat'} dir={sortDir} /></span>
                  </th>
                  <th className={`text-right ${thSort}`} onClick={() => handleSort('frais')}>
                    <span className="flex items-center justify-end">Frais<SortIcon active={sortKey === 'frais'} dir={sortDir} /></span>
                  </th>
                  <th className={`text-right ${th}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((commande) => {
                  const totalAchat = commande.articles.reduce((s, a) => s + a.prixAchat, 0)
                  const totalFrais = commande.frais.reduce((s, f) => s + f.montant, 0)
                  const isSelected = selection.has(commande.id)
                  return (
                    <tr
                      key={commande.id}
                      onClick={() => router.push(`/commandes/${commande.id}`)}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${isSelected ? 'bg-purple-500/8 hover:bg-purple-500/12' : 'hover:bg-white/5'}`}
                    >
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(commande.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 accent-purple-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-white">{commande.fournisseur}</p>
                        {commande.tracking && <p className="text-xs text-white/35 mt-0.5 font-mono">{commande.tracking}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-white/60">{new Date(commande.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3.5"><Badge statut={commande.statut} /></td>
                      <td className="px-4 py-3.5 text-right text-white/60">{commande.articles.length}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-white">{totalAchat > 0 ? `${totalAchat.toFixed(2)} €` : '—'}</td>
                      <td className="px-4 py-3.5 text-right text-white/60">{totalFrais > 0 ? `${totalFrais.toFixed(2)} €` : '—'}</td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditCommande(commande)} className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Modifier">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteId(commande.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors" title="Supprimer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-white/30">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors" title="Première page">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                {pageNumbers.map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="px-2 text-white/20 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${page === p ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors" title="Dernière page">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal edit */}
      {editCommande && (
        <Modal title="Modifier la commande" onClose={() => setEditCommande(null)}>
          <FormulaireCommande commande={editCommande} onClose={() => { setEditCommande(null); onRefresh() }} />
        </Modal>
      )}

      {/* Modal suppression simple */}
      {deleteId !== null && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-white/70 mb-6">Cette action supprimera définitivement la commande et tous ses articles et frais associés.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">Annuler</button>
            <button onClick={handleDelete} disabled={isPending} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
              {isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal suppression en masse */}
      {deleteSelection && (
        <Modal title="Supprimer la sélection" onClose={() => setDeleteSelection(false)}>
          <p className="text-sm text-white/70 mb-2">
            Tu vas supprimer <strong className="text-white">{selection.size} commande{selection.size > 1 ? 's' : ''}</strong> et tous leurs articles et frais associés.
          </p>
          <p className="text-xs text-red-400/70 mb-6">Cette action est irréversible.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteSelection(false)} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">Annuler</button>
            <button onClick={handleDeleteSelection} disabled={isPending} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
              {isPending ? 'Suppression...' : `Supprimer ${selection.size} commande${selection.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
