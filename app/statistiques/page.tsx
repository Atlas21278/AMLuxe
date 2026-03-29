'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { beneficeArticle, dureeVenteJours } from '@/lib/finance'
import type { Article, Commande, Frais } from '@prisma/client'

type ArticleAvecCommande = Article & { commande: Commande & { frais: Frais[] } }
type Periode = 'mois' | '3mois' | '6mois' | 'annee' | 'tout'

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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

function getMoisEntre(debut: Date, fin: Date): string[] {
  const mois: string[] = []
  const d = new Date(debut.getFullYear(), debut.getMonth(), 1)
  while (d <= fin) {
    mois.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return mois
}

function variation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return null
  return ((actuel - precedent) / Math.abs(precedent)) * 100
}

function VariationBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const pos = pct >= 0
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${pos ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
      {pos ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toFixed(0)
}

function fmtEur(n: number): string {
  return `${fmt(n)} €`
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-white/60">{entry.name}</span>
          <span className="text-white font-semibold ml-auto pl-4">{fmtEur(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { nb: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-white font-semibold">{d.name}</p>
      <p className="text-white/60">{fmtEur(d.value)}</p>
      <p className="text-white/40">{d.payload.nb} vente{d.payload.nb > 1 ? 's' : ''}</p>
    </div>
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
  const [abonnements, setAbonnements] = useState<{ mois: string; montant: number }[]>([])
  const [loading, setLoading] = useState(true)

  const periodeParam = (searchParams.get('periode') ?? 'tout') as Periode
  const periode: Periode = PERIODES.some(p => p.value === periodeParam) ? periodeParam : 'tout'

  const setPeriode = (p: Periode) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periode', p)
    router.replace(`?${params.toString()}`)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/articles').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/abonnements').then(r => r.ok ? r.json() : []),
    ]).then(([arts, abos]: [ArticleAvecCommande[], { mois: string; montant: number }[]]) => {
      setArticles(Array.isArray(arts) ? arts : [])
      setAbonnements(Array.isArray(abos) ? abos : [])
      setLoading(false)
    }).catch(() => {
      toast.error('Impossible de charger les statistiques')
      setLoading(false)
    })
  }, [])

  // ── Filtrage par période ───────────────────────────────────────────────────────
  const debut = useMemo(() => getDebut(periode), [periode])
  const precedente = useMemo(() => getDebutPrecedente(periode), [periode])

  // ── Groupes d'articles ────────────────────────────────────────────────────────
  const vendusAll = useMemo(() => articles.filter(a => a.statut === 'Vendu' && a.prixVenteReel), [articles])
  const enVente = useMemo(() => articles.filter(a => a.statut === 'En vente'), [articles])
  const enStock = useMemo(() => articles.filter(a => a.statut === 'En stock'), [articles])

  // Ventes dans la période (par dateVente)
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

  // Articles achetés dans la période (par createdAt) → capital engagé
  const articlesPeriode = useMemo(() => {
    if (!debut) return articles
    return articles.filter(a => new Date(a.createdAt) >= debut!)
  }, [articles, debut])

  // ── Capital investi (modèle cash flow) ───────────────────────────────────────
  // Frais commandes au prorata des articles achetés dans la période
  const totalParCommande = useMemo(() => {
    const map = new Map<number, number>()
    articles.forEach(a => map.set(a.commandeId, (map.get(a.commandeId) ?? 0) + 1))
    return map
  }, [articles])

  const fraisCommandePeriode = useMemo(() => {
    const commandesVues = new Map<number, { count: number; frais: number }>()
    articlesPeriode.forEach(a => {
      if (!commandesVues.has(a.commandeId)) {
        commandesVues.set(a.commandeId, {
          count: 0,
          frais: a.commande.frais.reduce((s, f) => s + f.montant, 0),
        })
      }
      commandesVues.get(a.commandeId)!.count++
    })
    return Array.from(commandesVues.entries()).reduce((acc, [commandeId, { count, frais }]) => {
      const total = totalParCommande.get(commandeId) ?? count
      return acc + frais * (count / total)
    }, 0)
  }, [articlesPeriode, totalParCommande])

  const capitalInvesti = useMemo(() =>
    articlesPeriode.reduce((acc, a) => acc + a.prixAchat, 0) + fraisCommandePeriode,
    [articlesPeriode, fraisCommandePeriode]
  )

  // ── Abonnements filtrés par période ──────────────────────────────────────────
  const coutAbonnementTotal = useMemo(() => {
    if (!debut) return abonnements.reduce((sum, a) => sum + a.montant, 0)
    const mois = new Set(getMoisEntre(debut, new Date()))
    return abonnements.filter(a => mois.has(a.mois)).reduce((sum, a) => sum + a.montant, 0)
  }, [abonnements, debut])

  const coutAbonnementPrecedent = useMemo(() => {
    if (!precedente) return 0
    const mois = new Set(getMoisEntre(precedente.debut, precedente.fin))
    return abonnements.filter(a => mois.has(a.mois)).reduce((sum, a) => sum + a.montant, 0)
  }, [abonnements, precedente])

  // ── KPIs revenus ─────────────────────────────────────────────────────────────
  const caTotal = useMemo(() => vendus.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0), [vendus])
  const fraisVenteTotal = useMemo(() => vendus.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0), [vendus])
  const beneficeBrut = useMemo(
    () => vendus.reduce((acc, a) => acc + beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0), 0),
    [vendus]
  )

  const caPrecedent = useMemo(() => vendusPrecedents.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0), [vendusPrecedents])
  const beneficeBrutPrecedent = useMemo(
    () => vendusPrecedents.reduce((acc, a) => acc + beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0), 0),
    [vendusPrecedents]
  )

  // ── Position nette (modèle cash flow) ────────────────────────────────────────
  // = revenus nets − capital engagé (achats + frais commandes + abonnements)
  const positionNette = useMemo(() =>
    (caTotal - fraisVenteTotal) - capitalInvesti - coutAbonnementTotal,
    [caTotal, fraisVenteTotal, capitalInvesti, coutAbonnementTotal]
  )

  const positionNettePrecedent = useMemo(() => {
    if (!precedente) return 0
    const artsPrecedents = articles.filter(a => new Date(a.createdAt) >= precedente!.debut && new Date(a.createdAt) <= precedente!.fin)
    const fraisPrecedents = (() => {
      const map = new Map<number, { count: number; frais: number }>()
      artsPrecedents.forEach(a => {
        if (!map.has(a.commandeId)) map.set(a.commandeId, { count: 0, frais: a.commande.frais.reduce((s, f) => s + f.montant, 0) })
        map.get(a.commandeId)!.count++
      })
      return Array.from(map.entries()).reduce((acc, [id, { count, frais }]) => acc + frais * (count / (totalParCommande.get(id) ?? count)), 0)
    })()
    const capitalPrecedent = artsPrecedents.reduce((acc, a) => acc + a.prixAchat, 0) + fraisPrecedents
    const caPrecedentNet = caPrecedent - vendusPrecedents.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0)
    return caPrecedentNet - capitalPrecedent - coutAbonnementPrecedent
  }, [articles, precedente, caPrecedent, vendusPrecedents, totalParCommande, coutAbonnementPrecedent])

  // ── Potentiel (si tout En vente se vend au prix affiché) ─────────────────────
  const caPotentiel = useMemo(() => enVente.reduce((acc, a) => acc + (a.prixVente ?? 0), 0), [enVente])
  const potentiel = positionNette + caPotentiel

  // ── Récupération investissement ───────────────────────────────────────────────
  const revenus = caTotal - fraisVenteTotal
  const tauxRecuperation = capitalInvesti > 0 ? Math.min(100, (revenus / capitalInvesti) * 100) : 0

  // ── KPIs secondaires ──────────────────────────────────────────────────────────
  const margeGlobale = caTotal > 0 ? ((beneficeBrut / caTotal) * 100) : 0
  const panierMoyen = vendus.length > 0 ? caTotal / vendus.length : 0
  const valeurStock = useMemo(() => [...enStock, ...enVente].reduce((acc, a) => acc + a.prixAchat, 0), [enStock, enVente])
  const dureeMoyenneVente = useMemo(() => {
    const v = vendus.filter(a => a.dateVente && a.createdAt)
    if (!v.length) return null
    return Math.round(v.reduce((acc, a) => acc + dureeVenteJours(a.createdAt, a.dateVente!), 0) / v.length)
  }, [vendus])

  // ── Breakdowns ────────────────────────────────────────────────────────────────
  const parMarque = useMemo(() => Object.values(
    vendus.reduce<Record<string, { marque: string; ca: number; benefice: number; nb: number }>>((acc, a) => {
      if (!acc[a.marque]) acc[a.marque] = { marque: a.marque, ca: 0, benefice: 0, nb: 0 }
      acc[a.marque].ca += a.prixVenteReel ?? 0
      acc[a.marque].benefice += beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0)
      acc[a.marque].nb++
      return acc
    }, {})
  ).sort((a, b) => b.benefice - a.benefice), [vendus])

  const parPlateforme = useMemo(() => Object.values(
    vendus.reduce<Record<string, { name: string; nb: number; ca: number }>>((acc, a) => {
      const p = a.plateforme ?? 'Autre'
      if (!acc[p]) acc[p] = { name: p, nb: 0, ca: 0 }
      acc[p].nb++
      acc[p].ca += a.prixVenteReel ?? 0
      return acc
    }, {})
  ).sort((a, b) => b.ca - a.ca), [vendus])

  const parFournisseur = useMemo(() => Object.values(
    vendus.reduce<Record<string, { fournisseur: string; nb: number; ca: number; benefice: number }>>((acc, a) => {
      const f = a.commande.fournisseur
      if (!acc[f]) acc[f] = { fournisseur: f, nb: 0, ca: 0, benefice: 0 }
      acc[f].nb++
      acc[f].ca += a.prixVenteReel ?? 0
      acc[f].benefice += beneficeArticle(a.prixVenteReel ?? 0, a.prixAchat, a.fraisVente ?? 0)
      return acc
    }, {})
  ).sort((a, b) => b.ca - a.ca), [vendus])

  // Évolution mensuelle — toujours sur toute la période pour la courbe complète
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
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [vendusAll])

  // ────────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="skeleton h-7 w-40 mb-2" />
        <div className="skeleton h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-5">
            <div className="skeleton h-3 w-24 mb-3" /><div className="skeleton h-8 w-28 mb-2" /><div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-4">
            <div className="skeleton h-3 w-20 mb-2" /><div className="skeleton h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white/3 border border-white/5 rounded-xl p-5 mb-4">
        <div className="skeleton h-4 w-48 mb-5" /><div className="skeleton h-52 w-full rounded-lg" />
      </div>
    </div>
  )

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Statistiques</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {periode === 'tout' ? 'Toute la période' : PERIODES.find(p => p.value === periode)?.label}
            {' · '}{articles.length} article{articles.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 self-start sm:self-auto">
          {PERIODES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriode(p.value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                periode === p.value ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs principaux ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        {/* Position nette */}
        <div className="col-span-2 lg:col-span-1 bg-white/3 border border-white/8 rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Position nette</p>
          <p className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${positionNette >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {positionNette >= 0 ? '+' : ''}{fmtEur(positionNette)}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-white/30">tous frais déduits</span>
            {periode !== 'tout' && <VariationBadge pct={variation(positionNette, positionNettePrecedent)} />}
          </div>
          {enVente.length > 0 && caPotentiel > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-white/35 leading-relaxed">
                potentiel{' '}
                <span className={`font-semibold ${potentiel >= 0 ? 'text-green-400/80' : 'text-orange-400/80'}`}>
                  {potentiel >= 0 ? '+' : ''}{fmtEur(potentiel)}
                </span>
                <span className="text-white/20 ml-1">si tout vendu</span>
              </p>
            </div>
          )}
        </div>

        {/* Capital investi */}
        <div className="bg-white/3 border border-white/8 rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Capital investi</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums leading-none">{fmtEur(capitalInvesti)}</p>
          <p className="text-xs text-white/30 mt-1.5">{articlesPeriode.length} achat{articlesPeriode.length > 1 ? 's' : ''}</p>
          {capitalInvesti > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/30">Récupéré</span>
                <span className={`font-medium ${tauxRecuperation >= 100 ? 'text-green-400' : 'text-white/50'}`}>
                  {tauxRecuperation.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${tauxRecuperation >= 100 ? 'bg-green-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(100, tauxRecuperation)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CA */}
        <div className="bg-white/3 border border-white/8 rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Chiffre d&apos;affaires</p>
          <p className="text-2xl font-bold text-white tabular-nums leading-none">{fmtEur(caTotal)}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-white/30">{vendus.length} vente{vendus.length > 1 ? 's' : ''}</span>
            {periode !== 'tout' && <VariationBadge pct={variation(caTotal, caPrecedent)} />}
          </div>
          {panierMoyen > 0 && (
            <p className="text-xs text-white/20 mt-2">panier moy. {fmtEur(panierMoyen)}</p>
          )}
        </div>

        {/* Marge brute */}
        <div className="bg-white/3 border border-white/8 rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Marge brute</p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${margeGlobale >= 20 ? 'text-green-400' : margeGlobale >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
            {margeGlobale.toFixed(1)}%
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-white/30">sur CA · {fmtEur(beneficeBrut)}</span>
            {periode !== 'tout' && <VariationBadge pct={variation(beneficeBrut, beneficeBrutPrecedent)} />}
          </div>
          {fraisVenteTotal > 0 && caTotal > 0 && (
            <p className="text-xs text-white/20 mt-2">commissions {((fraisVenteTotal / caTotal) * 100).toFixed(1)}% du CA</p>
          )}
        </div>
      </div>

      {/* ── KPIs secondaires ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/3 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/35 mb-1.5">En vente</p>
          <p className="text-xl font-bold text-purple-400">{enVente.length}</p>
          <p className="text-xs text-white/25 mt-0.5">pot. {fmtEur(caPotentiel)}</p>
        </div>
        <div className="bg-white/3 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/35 mb-1.5">En stock</p>
          <p className="text-xl font-bold text-blue-400">{enStock.length}</p>
          <p className="text-xs text-white/25 mt-0.5">{fmtEur(valeurStock)} investi</p>
        </div>
        <div className="bg-white/3 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/35 mb-1.5">Durée moy. vente</p>
          <p className={`text-xl font-bold ${dureeMoyenneVente !== null && dureeMoyenneVente <= 30 ? 'text-green-400' : 'text-yellow-400'}`}>
            {dureeMoyenneVente !== null ? `${dureeMoyenneVente}j` : '—'}
          </p>
          <p className="text-xs text-white/25 mt-0.5">réception → vente</p>
        </div>
        <div className="bg-white/3 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/35 mb-1.5">Frais plateforme</p>
          <p className="text-xl font-bold text-white/70">{fmtEur(fraisVenteTotal)}</p>
          <p className="text-xs text-white/25 mt-0.5">
            {caTotal > 0 ? `${((fraisVenteTotal / caTotal) * 100).toFixed(1)}%` : '0%'} du CA
          </p>
        </div>
      </div>

      {/* ── Décomposition financière ─────────────────────────────────────────── */}
      <div className="bg-white/3 border border-white/5 rounded-xl px-5 py-4">
        <p className="text-xs text-white/35 uppercase tracking-wider mb-3">Décomposition</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-white/70">CA <span className="font-semibold text-white">{fmtEur(caTotal)}</span></span>
          <span className="text-white/20">−</span>
          <span className="text-white/70">Commissions <span className="font-semibold text-white">{fmtEur(fraisVenteTotal)}</span></span>
          <span className="text-white/20">−</span>
          <span className="text-white/70">Achats <span className="font-semibold text-white">{fmtEur(articlesPeriode.reduce((acc, a) => acc + a.prixAchat, 0))}</span></span>
          <span className="text-white/20">−</span>
          <span className="text-white/70">Frais cde <span className="font-semibold text-white">{fmtEur(fraisCommandePeriode)}</span></span>
          {coutAbonnementTotal > 0 && (
            <>
              <span className="text-white/20">−</span>
              <span className="text-white/70">Abonnements <span className="font-semibold text-white">{fmtEur(coutAbonnementTotal)}</span></span>
            </>
          )}
          <span className="text-white/20">=</span>
          <span className={`font-bold text-base ${positionNette >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {positionNette >= 0 ? '+' : ''}{fmtEur(positionNette)}
          </span>
        </div>
      </div>

      {/* ── Évolution mensuelle ─────────────────────────────────────────────── */}
      {parMois.length > 0 && (
        <div className="bg-white/3 border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Évolution mensuelle</h2>
              <p className="text-xs text-white/30 mt-0.5">CA et bénéfice brut · toutes périodes</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-white/35">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-purple-400 rounded inline-block" />CA
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 rounded inline-block" />Bénéfice
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={parMois} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBenef" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmt(v)}€`} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="ca" name="CA" stroke="#a855f7" strokeWidth={2} fill="url(#gradCA)" dot={false} activeDot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="benefice" name="Bénéfice brut" stroke="#10b981" strokeWidth={2} fill="url(#gradBenef)" dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Plateformes + Marques ───────────────────────────────────────────── */}
      {(parPlateforme.length > 0 || parMarque.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {parPlateforme.length > 0 && (
            <div className="bg-white/3 border border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Par plateforme</h2>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={parPlateforme}
                        dataKey="ca"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={64}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {parPlateforme.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {parPlateforme.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-white/60 truncate flex-1">{p.name}</span>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-white">{fmtEur(p.ca)}</span>
                        <span className="text-xs text-white/30 ml-1.5">{p.nb}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {parMarque.length > 0 && (
            <div className="bg-white/3 border border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Bénéfice par marque</h2>
              <ResponsiveContainer width="100%" height={Math.max(140, Math.min(6, parMarque.length) * 36 + 10)}>
                <BarChart
                  data={parMarque.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmt(v)}€`} />
                  <YAxis type="category" dataKey="marque" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="benefice" name="Bénéfice" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {parMarque.slice(0, 6).map((entry, i) => (
                      <Cell key={i} fill={entry.benefice >= 0 ? '#a855f7' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Détail par fournisseur ──────────────────────────────────────────── */}
      {parFournisseur.length > 0 && (
        <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Par fournisseur</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-white/30 uppercase tracking-wider px-5 py-3 font-medium">Fournisseur</th>
                <th className="text-right text-xs text-white/30 uppercase tracking-wider px-4 py-3 font-medium">Ventes</th>
                <th className="text-right text-xs text-white/30 uppercase tracking-wider px-4 py-3 font-medium">CA</th>
                <th className="text-right text-xs text-white/30 uppercase tracking-wider px-5 py-3 font-medium">Bénéfice brut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {parFournisseur.map((f) => (
                <tr key={f.fournisseur} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-white/80 font-medium">{f.fournisseur}</td>
                  <td className="px-4 py-3 text-right text-white/50">{f.nb}</td>
                  <td className="px-4 py-3 text-right text-white tabular-nums">{fmtEur(f.ca)}</td>
                  <td className={`px-5 py-3 text-right font-semibold tabular-nums ${f.benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {f.benefice >= 0 ? '+' : ''}{fmtEur(f.benefice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Détail par marque ──────────────────────────────────────────────── */}
      {parMarque.length > 0 && (
        <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Par marque</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-white/30 uppercase tracking-wider px-5 py-3 font-medium">Marque</th>
                <th className="text-right text-xs text-white/30 uppercase tracking-wider px-4 py-3 font-medium">Ventes</th>
                <th className="text-right text-xs text-white/30 uppercase tracking-wider px-4 py-3 font-medium">CA</th>
                <th className="text-right text-xs text-white/30 uppercase tracking-wider px-5 py-3 font-medium">Bénéfice brut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {parMarque.map((m) => (
                <tr key={m.marque} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-white/80 font-medium">{m.marque}</td>
                  <td className="px-4 py-3 text-right text-white/50">{m.nb}</td>
                  <td className="px-4 py-3 text-right text-white tabular-nums">{fmtEur(m.ca)}</td>
                  <td className={`px-5 py-3 text-right font-semibold tabular-nums ${m.benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.benefice >= 0 ? '+' : ''}{fmtEur(m.benefice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Message si aucune vente ────────────────────────────────────────── */}
      {vendus.length === 0 && articles.length > 0 && (
        <div className="text-center py-16 text-white/30">
          <p className="text-sm">Aucune vente {periode !== 'tout' ? 'sur cette période' : 'enregistrée'}</p>
          {capitalInvesti > 0 && (
            <p className="text-xs mt-2 text-white/20">{fmtEur(capitalInvesti)} investis · potentiel {fmtEur(potentiel)} si tout vendu</p>
          )}
        </div>
      )}

    </div>
  )
}
