'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { beneficeArticle, beneficePotentielArticle, dureeVenteJours } from '@/lib/finance'
import type { Article, Commande, Frais } from '@prisma/client'

type ArticleAvecCommande = Article & { commande: Commande & { frais: Frais[] } }
type Periode = 'mois' | '3mois' | '6mois' | 'annee' | 'tout'

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const PERIODES: { value: Periode; label: string }[] = [
  { value: 'mois', label: 'Ce mois' },
  { value: '3mois', label: '3 mois' },
  { value: '6mois', label: '6 mois' },
  { value: 'annee', label: 'Cette année' },
  { value: 'tout', label: 'Tout' },
]

function getDebut(periode: Periode): Date | null {
  const now = new Date()
  if (periode === 'mois') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (periode === '3mois') return new Date(now.getFullYear(), now.getMonth() - 3, 1)
  if (periode === '6mois') return new Date(now.getFullYear(), now.getMonth() - 6, 1)
  if (periode === 'annee') return new Date(now.getFullYear(), 0, 1)
  return null
}

function getDebutPrecedente(periode: Periode): { debut: Date; fin: Date } | null {
  const now = new Date()
  if (periode === 'mois') return {
    debut: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    fin: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
  }
  if (periode === '3mois') return {
    debut: new Date(now.getFullYear(), now.getMonth() - 6, 1),
    fin: new Date(now.getFullYear(), now.getMonth() - 3, 0, 23, 59, 59),
  }
  if (periode === '6mois') return {
    debut: new Date(now.getFullYear(), now.getMonth() - 12, 1),
    fin: new Date(now.getFullYear(), now.getMonth() - 6, 0, 23, 59, 59),
  }
  if (periode === 'annee') return {
    debut: new Date(now.getFullYear() - 1, 0, 1),
    fin: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
  }
  return null
}

function variation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return null
  return ((actuel - precedent) / Math.abs(precedent)) * 100
}

function VariationBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const pos = pct >= 0
  return (
    <span className={`text-xs font-medium ${pos ? 'text-green-400' : 'text-red-400'}`}>
      {pos ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

export default function StatistiquesPage() {
  return (
    <Suspense>
      <StatistiquesInner />
    </Suspense>
  )
}

function StatistiquesInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [articles, setArticles] = useState<ArticleAvecCommande[]>([])
  const [loading, setLoading] = useState(true)
  const [coutAbonnementTotal, setCoutAbonnementTotal] = useState(0)

  const periodeParam = (searchParams.get('periode') ?? 'tout') as Periode
  const periode: Periode = PERIODES.some(p => p.value === periodeParam) ? periodeParam : 'tout'

  const setPeriode = (p: Periode) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periode', p)
    router.replace(`?${params.toString()}`)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/articles').then((r) => r.ok ? r.json() : Promise.reject()),
      fetch('/api/abonnements').then((r) => r.ok ? r.json() : []),
    ]).then(([arts, abonnements]: [ArticleAvecCommande[], { montant: number }[]]) => {
      setArticles(Array.isArray(arts) ? arts : [])
      setCoutAbonnementTotal(abonnements.reduce((sum, a) => sum + a.montant, 0))
      setLoading(false)
    }).catch(() => {
      toast.error('Impossible de charger les statistiques')
      setLoading(false)
    })
  }, [])

  const vendusAll = useMemo(() => articles.filter((a) => a.statut === 'Vendu' && a.prixVenteReel), [articles])
  const enVente = useMemo(() => articles.filter((a) => a.statut === 'En vente' && a.prixVente), [articles])
  const enStock = useMemo(() => articles.filter((a) => a.statut === 'En stock' || a.statut === 'En vente'), [articles])

  // ── Filtrage par période ────────────────────────────────────────────────────────────────
  const debut = useMemo(() => getDebut(periode), [periode])
  const precedente = useMemo(() => getDebutPrecedente(periode), [periode])

  const vendus = useMemo(() => {
    if (!debut) return vendusAll
    return vendusAll.filter(a => a.dateVente && new Date(a.dateVente) >= debut!)
  }, [vendusAll, debut])

  const vendusPrecedents = useMemo(() => {
    if (!precedente) return []
    return vendusAll.filter(a =>
      a.dateVente &&
      new Date(a.dateVente) >= precedente!.debut &&
      new Date(a.dateVente) <= precedente!.fin
    )
  }, [vendusAll, precedente])

  // ── Frais commandes (filtrés sur les commandes avec ventes dans la période) ────────────
  const fraisCommandeTotal = useMemo(() => {
    const source = debut ? vendus : articles
    const commandesVues = new Set<number>()
    return source.reduce((acc, a) => {
      if (commandesVues.has(a.commandeId)) return acc
      commandesVues.add(a.commandeId)
      // Pour "tout", on prend tous les frais de toutes les commandes via articles
      if (!debut) return acc + a.commande.frais.reduce((s, f) => s + f.montant, 0)
      return acc + a.commande.frais.reduce((s, f) => s + f.montant, 0)
    }, 0)
  }, [articles, vendus, debut])

  const fraisCommandePrecedent = useMemo(() => {
    if (!precedente) return 0
    const commandesVues = new Set<number>()
    return vendusPrecedents.reduce((acc, a) => {
      if (commandesVues.has(a.commandeId)) return acc
      commandesVues.add(a.commandeId)
      return acc + a.commande.frais.reduce((s, f) => s + f.montant, 0)
    }, 0)
  }, [vendusPrecedents, precedente])

  // ── KPIs période courante ──────────────────────────────────────────────────────────────
  const caTotal = useMemo(() => vendus.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0), [vendus])
  const fraisVenteTotal = useMemo(() => vendus.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0), [vendus])
  const coutAchatVendus = useMemo(() => vendus.reduce((acc, a) => acc + a.prixAchat, 0), [vendus])
  const beneficeBrut = useMemo(
    () => vendus.reduce((acc, a) => acc + beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0), 0),
    [vendus]
  )
  const beneficeNet = useMemo(
    () => beneficeBrut - fraisCommandeTotal - coutAbonnementTotal,
    [beneficeBrut, fraisCommandeTotal, coutAbonnementTotal]
  )
  const margeGlobale = caTotal > 0 ? ((beneficeNet / caTotal) * 100).toFixed(1) : '0'
  const panierMoyen = vendus.length > 0 ? caTotal / vendus.length : 0

  // ── KPIs période précédente (pour variation %) ────────────────────────────────────────
  const caPrecedent = useMemo(() => vendusPrecedents.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0), [vendusPrecedents])
  const beneficeBrutPrecedent = useMemo(
    () => vendusPrecedents.reduce((acc, a) => acc + beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0), 0),
    [vendusPrecedents]
  )
  const beneficeNetPrecedent = useMemo(
    () => beneficeBrutPrecedent - fraisCommandePrecedent - coutAbonnementTotal,
    [beneficeBrutPrecedent, fraisCommandePrecedent, coutAbonnementTotal]
  )

  // ── Stock & potentiel ───────────────────────────────────────────────────────────────────
  const valeurStock = useMemo(() => enStock.reduce((acc, a) => acc + a.prixAchat, 0), [enStock])
  const caPotentiel = useMemo(() => enVente.reduce((acc, a) => acc + (a.prixVente ?? 0), 0), [enVente])
  const beneficePotentiel = useMemo(
    () => enVente.reduce((acc, a) => acc + beneficePotentielArticle(a.prixVente ?? 0, a.prixAchat), 0),
    [enVente]
  )

  // ── Durée moyenne de vente ──────────────────────────────────────────────────────────────
  const dureeMoyenneVente = useMemo(() => {
    const vendusAvecDates = vendus.filter((a) => a.dateVente && a.createdAt)
    if (vendusAvecDates.length === 0) return null
    const total = vendusAvecDates.reduce((acc, a) => acc + dureeVenteJours(a.createdAt, a.dateVente!), 0)
    return Math.round(total / vendusAvecDates.length)
  }, [vendus])

  // ── Breakdowns ─────────────────────────────────────────────────────────────────────────
  const parMarque = useMemo(() => Object.values(
    vendus.reduce<Record<string, { marque: string; ca: number; benefice: number; nb: number }>>((acc, a) => {
      if (!acc[a.marque]) acc[a.marque] = { marque: a.marque, ca: 0, benefice: 0, nb: 0 }
      acc[a.marque].ca += a.prixVenteReel ?? 0
      acc[a.marque].benefice += beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0)
      acc[a.marque].nb += 1
      return acc
    }, {})
  ).sort((a, b) => b.benefice - a.benefice), [vendus])

  const parPlateforme = useMemo(() => Object.values(
    vendus.reduce<Record<string, { name: string; nb: number; ca: number }>>((acc, a) => {
      const p = a.plateforme ?? 'Autre'
      if (!acc[p]) acc[p] = { name: p, nb: 0, ca: 0 }
      acc[p].nb += 1
      acc[p].ca += a.prixVenteReel ?? 0
      return acc
    }, {})
  ).sort((a, b) => b.ca - a.ca), [vendus])

  const parFournisseur = useMemo(() => Object.values(
    vendus.reduce<Record<string, { fournisseur: string; nb: number; ca: number; benefice: number }>>((acc, a) => {
      const f = a.commande.fournisseur
      if (!acc[f]) acc[f] = { fournisseur: f, nb: 0, ca: 0, benefice: 0 }
      acc[f].nb += 1
      acc[f].ca += a.prixVenteReel ?? 0
      acc[f].benefice += beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0)
      return acc
    }, {})
  ).sort((a, b) => b.ca - a.ca), [vendus])

  const parMois = useMemo(() => {
    const map = vendusAll.reduce<Record<string, { mois: string; ca: number; benefice: number }>>((acc, a) => {
      if (!a.dateVente) return acc
      const d = new Date(a.dateVente)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      if (!acc[key]) acc[key] = { mois: label, ca: 0, benefice: 0 }
      acc[key].ca += a.prixVenteReel ?? 0
      acc[key].benefice += beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0)
      return acc
    }, {})
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => val)
  }, [vendusAll])

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8"><div className="skeleton h-7 w-40 mb-2" /><div className="skeleton h-4 w-56" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-4">
            <div className="skeleton h-3 w-24 mb-3" />
            <div className="skeleton h-6 w-20 mb-1.5" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white/3 border border-white/5 rounded-xl p-5 mb-6">
        <div className="skeleton h-4 w-48 mb-4" />
        <div className="flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-4 w-24" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="sm:col-span-2 bg-white/3 border border-white/5 rounded-xl p-5">
          <div className="skeleton h-4 w-56 mb-5" />
          <div className="skeleton h-52 w-full rounded-lg" />
        </div>
        <div className="bg-white/3 border border-white/5 rounded-xl p-5">
          <div className="skeleton h-4 w-40 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex justify-between py-3 border-b border-white/5"><div className="skeleton h-4 w-24" /><div className="skeleton h-4 w-16" /></div>)}
        </div>
        <div className="bg-white/3 border border-white/5 rounded-xl p-5">
          <div className="skeleton h-4 w-48 mb-5" />
          <div className="skeleton h-52 w-full rounded-lg" />
        </div>
        <div className="sm:col-span-2 bg-white/3 border border-white/5 rounded-xl p-5">
          <div className="skeleton h-4 w-36 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex justify-between py-3 border-b border-white/5"><div className="skeleton h-4 w-28" /><div className="skeleton h-4 w-16" /><div className="skeleton h-4 w-20" /><div className="skeleton h-4 w-16" /></div>)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      {/* Header + sélecteur période */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Statistiques</h1>
          <p className="text-sm text-white/40 mt-1">Vue d&apos;ensemble de la performance</p>
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 self-start sm:self-auto">
          {PERIODES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriode(p.value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                periode === p.value
                  ? 'bg-purple-600 text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
        {[
          {
            label: "Chiffre d'affaires",
            value: `${caTotal.toFixed(0)} €`,
            sub: `${vendus.length} vente${vendus.length > 1 ? 's' : ''}`,
            color: 'text-white',
            variation: variation(caTotal, caPrecedent),
          },
          {
            label: 'Bénéfice net',
            value: `${beneficeNet.toFixed(0)} €`,
            sub: 'après tous frais',
            color: beneficeNet >= 0 ? 'text-green-400' : 'text-red-400',
            variation: variation(beneficeNet, beneficeNetPrecedent),
          },
          {
            label: 'Marge globale',
            value: `${margeGlobale}%`,
            sub: 'sur CA',
            color: Number(margeGlobale) >= 20 ? 'text-green-400' : 'text-yellow-400',
            variation: null,
          },
          {
            label: 'Panier moyen',
            value: `${panierMoyen.toFixed(0)} €`,
            sub: 'par vente',
            color: 'text-white',
            variation: null,
          },
          {
            label: 'Durée moy. vente',
            value: dureeMoyenneVente !== null ? `${dureeMoyenneVente}j` : '—',
            sub: 'réception → vente',
            color: dureeMoyenneVente !== null && dureeMoyenneVente <= 30 ? 'text-green-400' : 'text-yellow-400',
            variation: null,
          },
          {
            label: 'Stock en cours',
            value: `${valeurStock.toFixed(0)} €`,
            sub: `${enStock.length} articles`,
            color: 'text-amber-400',
            variation: null,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1 leading-tight">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-white/30">{kpi.sub}</p>
              {kpi.variation !== null && periode !== 'tout' && (
                <VariationBadge pct={kpi.variation} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Décomposition bénéfice net */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Décomposition du bénéfice net</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm items-center">
          <span className="text-white/60">CA : <span className="text-white font-medium">{caTotal.toFixed(2)} €</span></span>
          <span className="text-white/30">−</span>
          <span className="text-white/60">Achats : <span className="text-white font-medium">{coutAchatVendus.toFixed(2)} €</span></span>
          <span className="text-white/30">−</span>
          <span className="text-white/60">Frais vente : <span className="text-white font-medium">{fraisVenteTotal.toFixed(2)} €</span></span>
          <span className="text-white/30">=</span>
          <span className="text-white/60">Bénéfice brut : <span className={`font-semibold ${beneficeBrut >= 0 ? 'text-green-400' : 'text-red-400'}`}>{beneficeBrut.toFixed(2)} €</span></span>
          <span className="text-white/30">−</span>
          <span className="text-white/60">Frais commandes : <span className="text-white font-medium">{fraisCommandeTotal.toFixed(2)} €</span></span>
          {coutAbonnementTotal > 0 && (
            <>
              <span className="text-white/30">−</span>
              <span className="text-white/60">Abonnements : <span className="text-white font-medium">{coutAbonnementTotal.toFixed(2)} €</span></span>
            </>
          )}
          <span className="text-white/30">=</span>
          <span className={`font-bold text-base ${beneficeNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>{beneficeNet.toFixed(2)} €</span>
        </div>
      </div>

      {/* Section potentiel — articles en vente */}
      {enVente.length > 0 && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="text-sm font-semibold text-purple-300">Potentiel en cours ({enVente.length} article{enVente.length > 1 ? 's' : ''} en vente)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">CA potentiel</p>
              <p className="text-xl font-bold text-purple-300">{caPotentiel.toFixed(0)} €</p>
              <p className="text-xs text-white/30 mt-0.5">si tout se vend au prix affiché</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Bénéfice potentiel</p>
              <p className={`text-xl font-bold ${beneficePotentiel >= 0 ? 'text-green-400' : 'text-red-400'}`}>{beneficePotentiel >= 0 ? '+' : ''}{beneficePotentiel.toFixed(0)} €</p>
              <p className="text-xs text-white/30 mt-0.5">avant frais de vente</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Investi en stock</p>
              <p className="text-xl font-bold text-amber-400">{enVente.reduce((acc, a) => acc + a.prixAchat, 0).toFixed(0)} €</p>
              <p className="text-xs text-white/30 mt-0.5">coût d&apos;achat des articles en vente</p>
            </div>
          </div>
        </div>
      )}

      {vendus.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-sm">Aucune vente {periode !== 'tout' ? 'sur cette période' : 'enregistrée pour le moment'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

          {/* Évolution CA / Bénéfice — toujours all-time pour avoir la courbe complète */}
          <div className="sm:col-span-2 bg-white/3 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Évolution mensuelle</h2>
            <p className="text-xs text-white/30 mb-5">CA et bénéfice brut (toutes périodes confondues)</p>
            <div className="h-40 sm:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parMois}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v) => [`${Number(v).toFixed(2)} €`]} />
                  <Line type="monotone" dataKey="ca" name="CA (€)" stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="benefice" name="Bénéfice brut (€)" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plateformes */}
          <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Ventes par plateforme</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs text-white/40 uppercase">Plateforme</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Ventes</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">CA</th>
                </tr>
              </thead>
              <tbody>
                {parPlateforme.map((p, i) => (
                  <tr key={p.name} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-white/80 font-medium">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/60">{p.nb}</td>
                    <td className="px-4 py-3 text-right text-white">{p.ca.toFixed(0)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bénéfice brut par marque — bar chart */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Bénéfice brut par marque</h2>
            <p className="text-xs text-white/30 mb-5">hors frais commandes</p>
            <div className="h-36 sm:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parMarque.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} €`} />
                  <YAxis type="category" dataKey="marque" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v) => [`${Number(v).toFixed(2)} €`, 'Bénéfice brut']} />
                  <Bar dataKey="benefice" name="Bénéfice brut (€)" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau par marque */}
          <div className="sm:col-span-2 bg-white/3 border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Détail par marque</h2>
              <p className="text-xs text-white/30 mt-0.5">Bénéfice brut — hors frais commandes</p>
            </div>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-white/5">
              {parMarque.map((m) => (
                <div key={m.marque} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white text-sm">{m.marque}</span>
                    <span className="text-xs text-white/40">{m.nb} pièce{m.nb > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-white/50">CA : <span className="text-white font-medium">{m.ca.toFixed(0)} €</span></span>
                    <span className={`font-semibold ${m.benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>{m.benefice >= 0 ? '+' : ''}{m.benefice.toFixed(0)} €</span>
                    <span className={m.ca > 0 && (m.benefice / m.ca * 100) >= 20 ? 'text-green-400' : 'text-yellow-400'}>
                      {m.ca > 0 ? `${(m.benefice / m.ca * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs text-white/40 uppercase">Marque</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Pièces</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">CA</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Bénéfice brut</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Marge brute</th>
                </tr>
              </thead>
              <tbody>
                {parMarque.map((m) => (
                  <tr key={m.marque} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-white">{m.marque}</td>
                    <td className="px-4 py-3 text-right text-white/60">{m.nb}</td>
                    <td className="px-4 py-3 text-right text-white">{m.ca.toFixed(0)} €</td>
                    <td className={`px-4 py-3 text-right font-medium ${m.benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>{m.benefice.toFixed(0)} €</td>
                    <td className={`px-4 py-3 text-right text-sm ${m.ca > 0 && (m.benefice / m.ca * 100) >= 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {m.ca > 0 ? `${(m.benefice / m.ca * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tableau par fournisseur */}
          {parFournisseur.length > 0 && (
            <div className="sm:col-span-2 bg-white/3 border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white">Performance par fournisseur</h2>
                <p className="text-xs text-white/30 mt-0.5">Bénéfice brut — hors frais commandes</p>
              </div>
              {/* Mobile: cards */}
              <div className="sm:hidden divide-y divide-white/5">
                {parFournisseur.map((f) => (
                  <div key={f.fournisseur} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm truncate">{f.fournisseur}</span>
                      <span className="text-xs text-white/40 shrink-0 ml-2">{f.nb} vendu{f.nb > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-white/50">CA : <span className="text-white font-medium">{f.ca.toFixed(0)} €</span></span>
                      <span className={`font-semibold ${f.benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>{f.benefice >= 0 ? '+' : ''}{f.benefice.toFixed(0)} €</span>
                      <span className={f.ca > 0 && (f.benefice / f.ca * 100) >= 20 ? 'text-green-400' : 'text-yellow-400'}>
                        {f.ca > 0 ? `${(f.benefice / f.ca * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <table className="hidden sm:table w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs text-white/40 uppercase">Fournisseur</th>
                    <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Pièces vendues</th>
                    <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">CA</th>
                    <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Bénéfice brut</th>
                    <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Marge brute</th>
                  </tr>
                </thead>
                <tbody>
                  {parFournisseur.map((f) => (
                    <tr key={f.fournisseur} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3 font-medium text-white">{f.fournisseur}</td>
                      <td className="px-4 py-3 text-right text-white/60">{f.nb}</td>
                      <td className="px-4 py-3 text-right text-white">{f.ca.toFixed(0)} €</td>
                      <td className={`px-4 py-3 text-right font-medium ${f.benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>{f.benefice.toFixed(0)} €</td>
                      <td className={`px-4 py-3 text-right text-sm ${f.ca > 0 && (f.benefice / f.ca * 100) >= 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {f.ca > 0 ? `${(f.benefice / f.ca * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
