'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import type { Commande, Article, Frais } from '@prisma/client'

type CommandeAvecDetails = Commande & { articles: Article[]; frais: Frais[] }

export default function DashboardPage() {
  const [commandes, setCommandes] = useState<CommandeAvecDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/commandes')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setCommandes(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        toast.error('Impossible de charger le tableau de bord')
        setLoading(false)
      })
  }, [])

  const now = new Date()
  const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const nomMois = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const articles = useMemo(() => commandes.flatMap((c) => c.articles), [commandes])

  const vendusMois = useMemo(
    () =>
      articles.filter((a) => {
        if (a.statut !== 'Vendu' || !a.dateVente) return false
        const d = new Date(a.dateVente)
        const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return mois === moisCourant
      }),
    [articles, moisCourant]
  )

  const caMois = useMemo(
    () => vendusMois.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0),
    [vendusMois]
  )
  const beneficeMois = useMemo(() => {
    const caTotal = vendusMois.reduce((sum, a) => sum + (a.prixVenteReel ?? 0), 0)
    const coutAchat = vendusMois.reduce((sum, a) => sum + a.prixAchat, 0)
    const fraisVente = vendusMois.reduce((sum, a) => sum + (a.fraisVente ?? 0), 0)
    // Frais de commande dédupliqués (une commande peut avoir plusieurs articles vendus ce mois)
    const commandeIdsSeen = new Set<number>()
    let fraisCommande = 0
    for (const a of vendusMois) {
      if (!commandeIdsSeen.has(a.commandeId)) {
        commandeIdsSeen.add(a.commandeId)
        const cmd = commandes.find((c) => c.id === a.commandeId)
        fraisCommande += cmd?.frais.reduce((s, f) => s + f.montant, 0) ?? 0
      }
    }
    return caTotal - coutAchat - fraisVente - fraisCommande
  }, [vendusMois, commandes])

  const enStock = useMemo(() => articles.filter((a) => a.statut === 'En stock').length, [articles])
  const enVente = useMemo(() => articles.filter((a) => a.statut === 'En vente').length, [articles])
  const commandesEnLivraison = useMemo(
    () => commandes.filter((c) => c.statut === 'En livraison'),
    [commandes]
  )
  const dernieresCommandes = useMemo(() => commandes.slice(0, 6), [commandes])

  // Articles récemment vendus (5 derniers)
  const derniersVendus = useMemo(
    () =>
      [...articles]
        .filter((a) => a.statut === 'Vendu' && a.dateVente)
        .sort((a, b) => new Date(b.dateVente!).getTime() - new Date(a.dateVente!).getTime())
        .slice(0, 5),
    [articles]
  )

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="skeleton h-7 w-48 mb-2" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-7 w-20" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full rounded-lg" />
              ))}
            </div>
            <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-sm text-white/40 mt-1 capitalize">{nomMois}</p>
      </div>

      {/* KPIs du mois */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          {
            label: 'CA du mois',
            value: `${caMois.toFixed(0)} €`,
            sub: `${vendusMois.length} vente${vendusMois.length !== 1 ? 's' : ''}`,
            color: 'text-white',
          },
          {
            label: 'Bénéfice du mois',
            value: `${beneficeMois.toFixed(0)} €`,
            sub: 'CA − achats − frais',
            color: beneficeMois >= 0 ? 'text-green-400' : 'text-red-400',
          },
          {
            label: 'En stock',
            value: enStock.toString(),
            sub: 'articles disponibles',
            color: 'text-amber-400',
          },
          {
            label: 'En vente',
            value: enVente.toString(),
            sub: 'annonces actives',
            color: 'text-purple-400',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1 leading-tight">
              {kpi.label}
            </p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerte commandes en livraison */}
      {commandesEnLivraison.length > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-blue-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
            />
          </svg>
          <p className="text-sm text-blue-400">
            <span className="font-semibold">{commandesEnLivraison.length} commande{commandesEnLivraison.length !== 1 ? 's' : ''}</span>{' '}
            en cours de livraison —{' '}
            {commandesEnLivraison.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                <Link href={`/commandes/${c.id}`} className="underline underline-offset-2 hover:text-blue-300 transition-colors">
                  {c.fournisseur}
                </Link>
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Dernières commandes */}
        <div className="lg:col-span-2 bg-white/3 border border-white/5 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Dernières commandes</h2>
            <Link
              href="/commandes"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Voir tout →
            </Link>
          </div>
          {dernieresCommandes.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-white/30 mb-3">Aucune commande</p>
              <Link
                href="/commandes"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-400 transition-colors"
              >
                Créer une commande
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {dernieresCommandes.map((commande) => {
                const totalAchat = commande.articles.reduce((acc, a) => acc + a.prixAchat, 0)
                const nbVendus = commande.articles.filter((a) => a.statut === 'Vendu').length
                return (
                  <Link
                    key={commande.id}
                    href={`/commandes/${commande.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors truncate">
                          {commande.fournisseur}
                        </p>
                        <p className="text-xs text-white/35 mt-0.5">
                          {new Date(commande.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' · '}
                          {commande.articles.length} article{commande.articles.length !== 1 ? 's' : ''}
                          {nbVendus > 0 && (
                            <span className="text-green-400/70"> · {nbVendus} vendu{nbVendus !== 1 ? 's' : ''}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-sm font-medium text-white/60 hidden sm:block">
                        {totalAchat.toFixed(0)} €
                      </span>
                      <Badge statut={commande.statut} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Articles récemment vendus */}
          <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Ventes récentes</h2>
              <Link
                href="/articles"
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Voir tout →
              </Link>
            </div>
            {derniersVendus.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/30">Aucune vente</div>
            ) : (
              <div className="divide-y divide-white/5">
                {derniersVendus.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {a.marque} {a.modele}
                      </p>
                      <p className="text-xs text-white/35">
                        {a.dateVente
                          ? new Date(a.dateVente).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : ''}
                      </p>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      <p className="text-sm font-medium text-green-400">
                        +{((a.prixVenteReel ?? 0) - (a.fraisVente ?? 0) - a.prixAchat).toFixed(0)} €
                      </p>
                      <p className="text-xs text-white/30">{a.plateforme ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accès rapides */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Accès rapides
            </h2>
            <div className="space-y-2">
              {[
                { href: '/commandes', label: 'Commandes', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { href: '/articles', label: 'Articles', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10' },
                { href: '/statistiques', label: 'Statistiques', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { href: '/export', label: 'Export Excel', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 shrink-0 text-white/30 group-hover:text-purple-400 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="text-sm">{item.label}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-white/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
