'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import type { Article, Commande, Frais } from '@prisma/client'

type ArticleAvecCommande = Article & { commande: Commande & { frais: Frais[] } }

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function StatistiquesPage() {
  const [articles, setArticles] = useState<ArticleAvecCommande[]>([])
  const [loading, setLoading] = useState(true)
  const [abonnementMensuel, setAbonnementMensuel] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/articles').then((r) => r.json()),
      fetch('/api/config').then((r) => r.json()),
    ]).then(([arts, config]) => {
      setArticles(arts)
      setAbonnementMensuel(Number(config.abonnementMensuel ?? 0))
      setLoading(false)
    })
  }, [])

  const vendus = articles.filter((a) => a.statut === 'Vendu' && a.prixVenteReel)
  const enStock = articles.filter((a) => a.statut === 'En stock' || a.statut === 'En vente')

  // KPIs globaux
  const caTotal = vendus.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0)
  const fraisVenteTotal = vendus.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0)
  const coutAchatTotal = vendus.reduce((acc, a) => acc + a.prixAchat, 0)

  // Frais commande (douane, livraison) — on prend toutes les commandes qui ont au moins un article vendu
  const commandesAvecVente = new Set(vendus.map((a) => a.commandeId))
  const fraisCommandeTotal = articles
    .filter((a) => commandesAvecVente.has(a.commandeId))
    .reduce((acc, a, _, arr) => {
      // Dédupliquer par commande
      const dejaPris = arr.slice(0, arr.indexOf(a)).some((b) => b.commandeId === a.commandeId)
      if (dejaPris) return acc
      return acc + a.commande.frais.reduce((s, f) => s + f.montant, 0)
    }, 0)

  // Abonnement : nb de mois depuis le premier achat jusqu'à maintenant
  const toutesLesDates = articles.map((a) => new Date(a.createdAt).getTime()).filter(Boolean)
  const nbMoisAbonnement = toutesLesDates.length > 0
    ? Math.max(1, Math.ceil(
        (Date.now() - Math.min(...toutesLesDates)) / (1000 * 60 * 60 * 24 * 30)
      ))
    : 0
  const coutAbonnementTotal = abonnementMensuel * nbMoisAbonnement

  const beneficeTotal = caTotal - fraisVenteTotal - coutAchatTotal - fraisCommandeTotal - coutAbonnementTotal
  const margeGlobale = caTotal > 0 ? ((beneficeTotal / caTotal) * 100).toFixed(1) : '0'

  // Valeur stock
  const valeurStock = enStock.reduce((acc, a) => acc + a.prixAchat, 0)

  // Par marque
  const parMarque = Object.values(
    vendus.reduce<Record<string, { marque: string; ca: number; benefice: number; nb: number }>>((acc, a) => {
      if (!acc[a.marque]) acc[a.marque] = { marque: a.marque, ca: 0, benefice: 0, nb: 0 }
      acc[a.marque].ca += a.prixVenteReel ?? 0
      acc[a.marque].benefice += (a.prixVenteReel ?? 0) - (a.fraisVente ?? 0) - a.prixAchat
      acc[a.marque].nb += 1
      return acc
    }, {})
  ).sort((a, b) => b.benefice - a.benefice)

  // Par plateforme — CA + nb
  const parPlateforme = Object.values(
    vendus.reduce<Record<string, { name: string; nb: number; ca: number }>>((acc, a) => {
      const p = a.plateforme ?? 'Autre'
      if (!acc[p]) acc[p] = { name: p, nb: 0, ca: 0 }
      acc[p].nb += 1
      acc[p].ca += a.prixVenteReel ?? 0
      return acc
    }, {})
  ).sort((a, b) => b.ca - a.ca)

  // Evolution mensuelle
  const parMoisMap = vendus.reduce<Record<string, { mois: string; ca: number; benefice: number }>>((acc, a) => {
    if (!a.dateVente) return acc
    const d = new Date(a.dateVente)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    if (!acc[key]) acc[key] = { mois: label, ca: 0, benefice: 0 }
    acc[key].ca += a.prixVenteReel ?? 0
    acc[key].benefice += (a.prixVenteReel ?? 0) - (a.fraisVente ?? 0) - a.prixAchat
    return acc
  }, {})
  const parMois = Object.entries(parMoisMap)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, val]) => val)

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8"><div className="skeleton h-7 w-40 mb-2" /><div className="skeleton h-4 w-56" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-4"><div className="skeleton h-3 w-20 mb-3" /><div className="skeleton h-7 w-28" /></div>)}
      </div>
      <div className="skeleton h-64 w-full rounded-xl" />
    </div>
  )

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Statistiques</h1>
        <p className="text-sm text-white/40 mt-1">Vue d&apos;ensemble de la performance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Chiffre d'affaires", value: `${caTotal.toFixed(0)} €`, sub: `${vendus.length} ventes`, color: 'text-white' },
          { label: 'Bénéfice net', value: `${beneficeTotal.toFixed(0)} €`, sub: 'après tous frais', color: beneficeTotal >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Marge globale', value: `${margeGlobale}%`, sub: 'sur CA', color: Number(margeGlobale) >= 20 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Frais de vente', value: `${fraisVenteTotal.toFixed(0)} €`, sub: 'commissions', color: 'text-white' },
          { label: 'Frais douane/livr.', value: `${fraisCommandeTotal.toFixed(0)} €`, sub: 'sur commandes vendues', color: 'text-white' },
          { label: 'Stock en cours', value: `${valeurStock.toFixed(0)} €`, sub: `${enStock.length} articles`, color: 'text-amber-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1 leading-tight">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Décomposition des coûts */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Décomposition du bénéfice</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <span className="text-white/60">CA : <span className="text-white font-medium">{caTotal.toFixed(2)} €</span></span>
          <span className="text-white/40">−</span>
          <span className="text-white/60">Achats : <span className="text-white font-medium">{coutAchatTotal.toFixed(2)} €</span></span>
          <span className="text-white/40">−</span>
          <span className="text-white/60">Frais vente : <span className="text-white font-medium">{fraisVenteTotal.toFixed(2)} €</span></span>
          <span className="text-white/40">−</span>
          <span className="text-white/60">Douane/livr. : <span className="text-white font-medium">{fraisCommandeTotal.toFixed(2)} €</span></span>
          {abonnementMensuel > 0 && (
            <>
              <span className="text-white/40">−</span>
              <span className="text-white/60">
                Abonnement ({nbMoisAbonnement} mois × {abonnementMensuel} €) :{' '}
                <span className="text-white font-medium">{coutAbonnementTotal.toFixed(2)} €</span>
              </span>
            </>
          )}
          <span className="text-white/40">=</span>
          <span className={`font-bold ${beneficeTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {beneficeTotal.toFixed(2)} €
          </span>
        </div>
      </div>

      {vendus.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-sm">Aucune vente enregistrée pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Evolution CA / Bénéfice */}
          <div className="sm:col-span-2 bg-white/3 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-5">Évolution mensuelle (CA & Bénéfice)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={parMois}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [`${v.toFixed(2)} €`]} />
                <Line type="monotone" dataKey="ca" name="CA (€)" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="benefice" name="Bénéfice brut (€)" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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

          {/* Bénéfice par marque — bar chart */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-5">Bénéfice brut par marque</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={parMarque.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} €`} />
                <YAxis type="category" dataKey="marque" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [`${v.toFixed(2)} €`, 'Bénéfice brut']} />
                <Bar dataKey="benefice" name="Bénéfice brut (€)" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau par marque */}
          <div className="sm:col-span-2 bg-white/3 border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Détail par marque</h2>
            </div>
            <table className="w-full text-sm">
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
        </div>
      )}
    </div>
  )
}
