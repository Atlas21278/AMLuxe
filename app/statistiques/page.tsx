'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import type { Article, Commande, Frais } from '@prisma/client'

type ArticleAvecCommande = Article & { commande: Commande & { frais: Frais[] } }

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function StatistiquesPage() {
  const [articles, setArticles] = useState<ArticleAvecCommande[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => r.json())
      .then((data) => { setArticles(data); setLoading(false) })
  }, [])

  const vendus = articles.filter((a) => a.statut === 'Vendu' && a.prixVenteReel)

  // KPIs globaux
  const caTotal = vendus.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0)
  const fraisVenteTotal = vendus.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0)
  const coutAchatTotal = vendus.reduce((acc, a) => acc + a.prixAchat, 0)
  const beneficeTotal = caTotal - fraisVenteTotal - coutAchatTotal
  const margeGlobale = caTotal > 0 ? ((beneficeTotal / caTotal) * 100).toFixed(1) : '0'

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

  // Par plateforme
  const parPlateforme = Object.values(
    vendus.reduce<Record<string, { name: string; value: number }>>((acc, a) => {
      const p = a.plateforme ?? 'Autre'
      if (!acc[p]) acc[p] = { name: p, value: 0 }
      acc[p].value += 1
      return acc
    }, {})
  )

  // Evolution mensuelle
  const parMois = Object.values(
    vendus.reduce<Record<string, { mois: string; ca: number; benefice: number }>>((acc, a) => {
      if (!a.dateVente) return acc
      const d = new Date(a.dateVente)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      if (!acc[key]) acc[key] = { mois: label, ca: 0, benefice: 0 }
      acc[key].ca += a.prixVenteReel ?? 0
      acc[key].benefice += (a.prixVenteReel ?? 0) - (a.fraisVente ?? 0) - a.prixAchat
      return acc
    }, {})
  ).sort((a, b) => a.mois.localeCompare(b.mois))

  if (loading) return <div className="p-8 text-white/40 text-sm">Chargement...</div>

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Statistiques</h1>
        <p className="text-sm text-white/40 mt-1">Vue d&apos;ensemble de la performance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Chiffre d'affaires", value: `${caTotal.toFixed(2)} €`, sub: `${vendus.length} ventes`, color: 'text-white' },
          { label: 'Bénéfice net', value: `${beneficeTotal.toFixed(2)} €`, sub: `après tous frais`, color: beneficeTotal >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Marge globale', value: `${margeGlobale}%`, sub: 'sur CA', color: Number(margeGlobale) >= 20 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Frais de vente', value: `${fraisVenteTotal.toFixed(2)} €`, sub: 'commissions plateformes', color: 'text-white' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {vendus.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-sm">Aucune vente enregistrée pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Evolution CA / Bénéfice */}
          <div className="col-span-2 bg-white/3 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-5">Évolution mensuelle (CA & Bénéfice)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={parMois}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <Line type="monotone" dataKey="ca" name="CA (€)" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="benefice" name="Bénéfice (€)" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Par marque */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-5">Bénéfice par marque</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={parMarque} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="marque" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="benefice" name="Bénéfice (€)" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Par plateforme */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-5">Répartition par plateforme</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={parPlateforme} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {parPlateforme.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau par marque */}
          <div className="col-span-2 bg-white/3 border border-white/5 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Détail par marque</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs text-white/40 uppercase">Marque</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Pièces vendues</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">CA</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Bénéfice</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 uppercase">Marge</th>
                </tr>
              </thead>
              <tbody>
                {parMarque.map((m) => (
                  <tr key={m.marque} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-white">{m.marque}</td>
                    <td className="px-4 py-3 text-right text-white/60">{m.nb}</td>
                    <td className="px-4 py-3 text-right text-white">{m.ca.toFixed(2)} €</td>
                    <td className={`px-4 py-3 text-right font-medium ${m.benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>{m.benefice.toFixed(2)} €</td>
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
