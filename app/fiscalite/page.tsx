'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import type { Article, Commande, Frais, AbonnementMensuel, DepensePro } from '@prisma/client'

type ArticleAvecCommande = Article & { commande: Commande & { frais: Frais[] } }
type Periode = 'mois' | 'trimestre' | 'annee' | 'perso'

const SEUIL_TVA = 36800
const SEUIL_TVA_TOLERANCE = 39100
const IS_TAUX_REDUIT = 0.15
const IS_TAUX_NORMAL = 0.25
const IS_PLAFOND_REDUIT = 42500

const CATEGORIES_DEPENSE = [
  'Matériel d\'emballage',
  'Honoraires (comptable, avocat)',
  'Frais bancaires',
  'Transport / déplacement',
  'Équipement informatique',
  'Marketing / publicité',
  'Téléphone / Internet',
  'Fournitures de bureau',
  'Autres charges',
]

function getMoisEntre(debut: Date, fin: Date): string[] {
  const mois: string[] = []
  const d = new Date(debut.getFullYear(), debut.getMonth(), 1)
  while (d <= fin) {
    mois.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return mois
}

function getDebutPeriode(periode: Periode, persoDebut: string, persoFin: string): { debut: Date; fin: Date } {
  const now = new Date()
  if (periode === 'mois') return { debut: new Date(now.getFullYear(), now.getMonth(), 1), fin: now }
  if (periode === 'trimestre') {
    const t = Math.floor(now.getMonth() / 3)
    return { debut: new Date(now.getFullYear(), t * 3, 1), fin: now }
  }
  if (periode === 'annee') return { debut: new Date(now.getFullYear(), 0, 1), fin: now }
  return {
    debut: persoDebut ? new Date(persoDebut) : new Date(now.getFullYear(), 0, 1),
    fin: persoFin ? new Date(persoFin + 'T23:59:59') : now,
  }
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function LigneCR({ label, valeur, bold, indent, separator, positive }: {
  label: string; valeur: number; bold?: boolean; indent?: boolean; separator?: boolean; positive?: boolean
}) {
  const couleur = positive === undefined
    ? (valeur >= 0 ? 'text-white' : 'text-red-400')
    : (positive ? 'text-green-400' : 'text-red-400')
  return (
    <div className={`flex items-center justify-between py-2.5 ${separator ? 'border-t border-white/10 mt-1' : ''} ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-white/60'}`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? 'font-bold ' + couleur : 'text-white/70'}`}>
        {valeur >= 0 ? '' : '−'}{fmt(Math.abs(valeur))} €
      </span>
    </div>
  )
}

// ── Modal ajout/édition dépense ───────────────────────────────────────────────
function ModalDepense({ depense, onClose, onSaved }: {
  depense?: DepensePro | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    date: depense?.date ? new Date(depense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    montant: depense?.montant?.toString() ?? '',
    categorie: depense?.categorie ?? CATEGORIES_DEPENSE[0],
    description: depense?.description ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = depense ? `/api/depenses/${depense.id}` : '/api/depenses'
      const method = depense ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          montant: parseFloat(form.montant),
          categorie: form.categorie,
          description: form.description || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(depense ? 'Dépense modifiée' : 'Dépense ajoutée')
      onSaved()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#13131c] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">{depense ? 'Modifier la dépense' : 'Ajouter une dépense'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Montant (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={form.montant}
                onChange={e => setForm({ ...form, montant: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Catégorie *</label>
            <select
              required
              value={form.categorie}
              onChange={e => setForm({ ...form, categorie: e.target.value })}
              className={inputClass}
            >
              {CATEGORIES_DEPENSE.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="Ex : 200 rouleaux de papier bulle"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
              {saving ? 'Enregistrement...' : (depense ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function FiscalitePage() {
  const [articles, setArticles] = useState<ArticleAvecCommande[]>([])
  const [abonnements, setAbonnements] = useState<AbonnementMensuel[]>([])
  const [depenses, setDepenses] = useState<DepensePro[]>([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState<Periode>('annee')
  const [persoDebut, setPersoDebut] = useState('')
  const [persoFin, setPersoFin] = useState('')
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [modalDepense, setModalDepense] = useState<{ open: boolean; depense?: DepensePro | null }>({ open: false })

  const fetchAll = () => {
    Promise.all([
      fetch('/api/articles').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/abonnements').then(r => r.ok ? r.json() : []),
      fetch('/api/depenses').then(r => r.ok ? r.json() : []),
    ]).then(([arts, abos, deps]: [ArticleAvecCommande[], AbonnementMensuel[], DepensePro[]]) => {
      setArticles(Array.isArray(arts) ? arts : [])
      setAbonnements(Array.isArray(abos) ? abos : [])
      setDepenses(Array.isArray(deps) ? deps : [])
      setLoading(false)
    }).catch(() => {
      toast.error('Impossible de charger les données')
      setLoading(false)
    })
  }

  useEffect(() => { fetchAll() }, [])

  const { debut, fin } = useMemo(
    () => getDebutPeriode(periode, persoDebut, persoFin),
    [periode, persoDebut, persoFin]
  )

  // ── Articles vendus dans la période ──────────────────────────────────────────
  const vendus = useMemo(() =>
    articles.filter(a =>
      a.statut === 'Vendu' && a.prixVenteReel && a.dateVente &&
      new Date(a.dateVente) >= debut && new Date(a.dateVente) <= fin
    ),
    [articles, debut, fin]
  )

  const ca = useMemo(() => vendus.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0), [vendus])
  const commissionsPlateformes = useMemo(() => vendus.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0), [vendus])

  // ── CAMV (coût d'achat des marchandises vendues) ───────────────────────────
  const totalParCommande = useMemo(() => {
    const map = new Map<number, number>()
    articles.forEach(a => map.set(a.commandeId, (map.get(a.commandeId) ?? 0) + 1))
    return map
  }, [articles])

  const { camv, fraisCommandesDetail } = useMemo(() => {
    const prixAchatTotal = vendus.reduce((acc, a) => acc + a.prixAchat, 0)
    const commandesVues = new Map<number, { count: number; frais: number; fournisseur: string; totalFrais: number }>()

    vendus.forEach(a => {
      if (!commandesVues.has(a.commandeId)) {
        const totalFrais = a.commande.frais.reduce((s, f) => s + f.montant, 0)
        commandesVues.set(a.commandeId, { count: 0, frais: totalFrais, fournisseur: a.commande.fournisseur ?? 'Inconnu', totalFrais })
      }
      commandesVues.get(a.commandeId)!.count++
    })

    const detail: { fournisseur: string; fraisTotaux: number; fraisImputés: number }[] = []
    let fraisTotal = 0

    commandesVues.forEach(({ count, frais, fournisseur, totalFrais }, commandeId) => {
      const total = totalParCommande.get(commandeId) ?? count
      const fraisImputés = frais * (count / total)
      fraisTotal += fraisImputés
      detail.push({ fournisseur, fraisTotaux: totalFrais, fraisImputés })
    })

    return { camv: prixAchatTotal + fraisTotal, fraisCommandesDetail: detail }
  }, [vendus, totalParCommande])

  const margebrute = ca - camv

  // ── Abonnements filtrés par période ──────────────────────────────────────────
  const abonnementsPeriode = useMemo(() => {
    const mois = new Set(getMoisEntre(debut, fin))
    return abonnements.filter(a => mois.has(a.mois))
  }, [abonnements, debut, fin])

  const coutAbonnements = useMemo(() => abonnementsPeriode.reduce((sum, a) => sum + a.montant, 0), [abonnementsPeriode])

  // ── Dépenses pro filtrées par période ────────────────────────────────────────
  const depensesPeriode = useMemo(() =>
    depenses.filter(d => {
      const date = new Date(d.date)
      return date >= debut && date <= fin
    }),
    [depenses, debut, fin]
  )

  const totalDepenses = useMemo(() => depensesPeriode.reduce((sum, d) => sum + d.montant, 0), [depensesPeriode])

  const depensesParCategorie = useMemo(() => {
    const map = new Map<string, number>()
    depensesPeriode.forEach(d => map.set(d.categorie, (map.get(d.categorie) ?? 0) + d.montant))
    return Array.from(map.entries()).map(([categorie, montant]) => ({ categorie, montant }))
      .sort((a, b) => b.montant - a.montant)
  }, [depensesPeriode])

  // ── Résultats ────────────────────────────────────────────────────────────────
  const resultatExploitation = margebrute - commissionsPlateformes - coutAbonnements - totalDepenses

  const baseImposable = Math.max(0, resultatExploitation)
  const isPartReduite = Math.min(baseImposable, IS_PLAFOND_REDUIT) * IS_TAUX_REDUIT
  const isPartNormale = Math.max(0, baseImposable - IS_PLAFOND_REDUIT) * IS_TAUX_NORMAL
  const isEstime = isPartReduite + isPartNormale
  const resultatNet = resultatExploitation - isEstime

  // ── TVA ──────────────────────────────────────────────────────────────────────
  const caAnnuelCivil = useMemo(() => {
    const debutAnnee = new Date(new Date().getFullYear(), 0, 1)
    return articles
      .filter(a => a.statut === 'Vendu' && a.prixVenteReel && a.dateVente && new Date(a.dateVente) >= debutAnnee)
      .reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0)
  }, [articles])

  const pctTVA = Math.min(100, (caAnnuelCivil / SEUIL_TVA) * 100)
  const alerteTVA = caAnnuelCivil >= SEUIL_TVA_TOLERANCE ? 'depassement' : caAnnuelCivil >= SEUIL_TVA * 0.8 ? 'attention' : null

  // ── Commissions par plateforme ────────────────────────────────────────────────
  const commissionsPlateforme = useMemo(() => {
    const map = new Map<string, { frais: number; nb: number }>()
    vendus.forEach(a => {
      const p = a.plateforme ?? 'Inconnue'
      const cur = map.get(p) ?? { frais: 0, nb: 0 }
      map.set(p, { frais: cur.frais + (a.fraisVente ?? 0), nb: cur.nb + 1 })
    })
    return Array.from(map.entries()).map(([plateforme, data]) => ({ plateforme, ...data }))
  }, [vendus])

  const labelPeriode = useMemo(() => {
    const d = debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    const f = fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${d} → ${f}`
  }, [debut, fin])

  // ── Suppression dépense ──────────────────────────────────────────────────────
  const supprimerDepense = async (id: number) => {
    if (!confirm('Supprimer cette dépense ?')) return
    const res = await fetch(`/api/depenses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Dépense supprimée')
      fetchAll()
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExportLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      doc.setFillColor(124, 58, 237)
      doc.rect(0, 0, 210, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('AMLuxe — Compte de résultat', 14, 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Période : ${labelPeriode}`, 14, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 150, 20)

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Compte de résultat simplifié', 14, 38)

      autoTable(doc, {
        startY: 42,
        head: [['Ligne', 'Montant (€)']],
        body: [
          ['Chiffre d\'affaires', fmt(ca)],
          ['  Coût d\'achat des marchandises vendues', `−${fmt(camv)}`],
          ['MARGE BRUTE', fmt(margebrute)],
          ['  Commissions plateformes', `−${fmt(commissionsPlateformes)}`],
          ['  Abonnements', `−${fmt(coutAbonnements)}`],
          ['  Dépenses professionnelles', `−${fmt(totalDepenses)}`],
          ['RÉSULTAT D\'EXPLOITATION', fmt(resultatExploitation)],
          ['  IS estimé', `−${fmt(isEstime)}`],
          ['RÉSULTAT NET ESTIMÉ', fmt(resultatNet)],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [124, 58, 237] },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        didParseCell: (data) => {
          if ([2, 6, 8].includes(data.row.index) && data.section === 'body') {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })

      const getY = () => (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Dépenses professionnelles', 14, getY())

      autoTable(doc, {
        startY: getY() + 4 - 10,
        head: [['Date', 'Catégorie', 'Description', 'Montant (€)']],
        body: depensesPeriode.map(d => [
          new Date(d.date).toLocaleDateString('fr-FR'),
          d.categorie,
          d.description ?? '',
          fmt(d.montant),
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [124, 58, 237] },
        foot: [['', '', 'Total', fmt(totalDepenses)]],
        footStyles: { fontStyle: 'bold' },
      })

      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text('Estimation indicative — à valider avec votre expert-comptable', 14, 285)

      doc.save(`AMLuxe_ComptesResultat_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF exporté')
    } catch {
      toast.error('Erreur lors de l\'export PDF')
    } finally {
      setExportLoading(false)
    }
  }

  // ── Export Excel ──────────────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExportLoading(true)
    try {
      const { utils, writeFile } = await import('xlsx')
      const wb = utils.book_new()

      const cr = utils.aoa_to_sheet([
        [`Compte de résultat — ${labelPeriode}`],
        [],
        ['Ligne', 'Montant (€)'],
        ['Chiffre d\'affaires', ca],
        ['Coût d\'achat des marchandises vendues', -camv],
        ['MARGE BRUTE', margebrute],
        ['Commissions plateformes', -commissionsPlateformes],
        ['Abonnements', -coutAbonnements],
        ['Dépenses professionnelles', -totalDepenses],
        ['RÉSULTAT D\'EXPLOITATION', resultatExploitation],
        ['IS estimé', -isEstime],
        ['RÉSULTAT NET ESTIMÉ', resultatNet],
      ])
      utils.book_append_sheet(wb, cr, 'Compte de résultat')

      const deps = utils.aoa_to_sheet([
        ['Date', 'Catégorie', 'Description', 'Montant (€)'],
        ...depensesPeriode.map(d => [
          new Date(d.date).toLocaleDateString('fr-FR'),
          d.categorie,
          d.description ?? '',
          d.montant,
        ]),
        [],
        ['', '', 'Total', totalDepenses],
      ])
      utils.book_append_sheet(wb, deps, 'Dépenses pro')

      const charges = utils.aoa_to_sheet([
        ['Fournisseur', 'Frais totaux (€)', 'Frais imputés prorata (€)'],
        ...fraisCommandesDetail.map(r => [r.fournisseur, r.fraisTotaux, r.fraisImputés]),
        [],
        ['Plateforme', 'Commissions (€)', 'Nb ventes'],
        ...commissionsPlateforme.map(p => [p.plateforme, p.frais, p.nb]),
        [],
        ['Mois', 'Abonnements (€)'],
        ...abonnementsPeriode.map(a => [a.mois, a.montant]),
      ])
      utils.book_append_sheet(wb, charges, 'Charges détail')

      writeFile(wb, `AMLuxe_Fiscalite_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel exporté')
    } catch {
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setExportLoading(false)
    }
  }

  const PERIODES: { value: Periode; label: string }[] = [
    { value: 'mois', label: 'Ce mois' },
    { value: 'trimestre', label: 'Ce trimestre' },
    { value: 'annee', label: 'Cette année' },
    { value: 'perso', label: 'Personnalisé' },
  ]

  if (loading) {
    return (
      <div className="page-enter p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-lg w-48" />
          <div className="h-48 bg-white/5 rounded-xl" />
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Fiscalité / Comptabilité</h1>
          <p className="text-sm text-white/40 mt-0.5">{labelPeriode}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            disabled={exportLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={exportLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm text-white font-medium transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Sélecteur période */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PERIODES.map(p => (
            <button key={p.value} onClick={() => setPeriode(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                periode === p.value
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-400'
                  : 'border-white/10 text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >{p.label}</button>
          ))}
        </div>
        {periode === 'perso' && (
          <div className="flex flex-wrap gap-3 items-center">
            <input type="date" value={persoDebut} onChange={e => setPersoDebut(e.target.value)}
              className="bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/60" />
            <span className="text-white/40 text-sm">→</span>
            <input type="date" value={persoFin} onChange={e => setPersoFin(e.target.value)}
              className="bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/60" />
          </div>
        )}
      </div>

      {/* Bannière TVA */}
      <div className={`rounded-xl border p-4 ${
        alerteTVA === 'depassement' ? 'bg-red-500/10 border-red-500/30'
        : alerteTVA === 'attention' ? 'bg-orange-500/10 border-orange-500/30'
        : 'bg-white/3 border-white/5'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {alerteTVA === 'depassement' ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Seuil TVA dépassé</span>
              ) : alerteTVA === 'attention' ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Attention — seuil TVA approche</span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Franchise en base TVA</span>
              )}
            </div>
            <p className="text-xs text-white/40 mt-1">
              CA {new Date().getFullYear()} : <span className="text-white font-medium">{fmt(caAnnuelCivil)} €</span>
              {' / '}seuil <span className="text-white/60">{fmt(SEUIL_TVA)} €</span> (tolérance {fmt(SEUIL_TVA_TOLERANCE)} €)
            </p>
          </div>
          <div className="sm:w-48 shrink-0">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>0 €</span>
              <span>{fmt(SEUIL_TVA)} €</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${alerteTVA === 'depassement' ? 'bg-red-500' : alerteTVA === 'attention' ? 'bg-orange-400' : 'bg-green-500'}`}
                style={{ width: `${pctTVA}%` }}
              />
            </div>
            <p className="text-xs text-white/30 mt-1 text-right">{pctTVA.toFixed(1)} %</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Compte de résultat */}
        <div className="bg-white/3 rounded-xl border border-white/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Compte de résultat simplifié</h2>
          <p className="text-xs text-white/30 mb-4">{labelPeriode}</p>
          <div className="divide-y divide-white/5">
            <LigneCR label="Chiffre d'affaires" valeur={ca} />
            <LigneCR label="Coût d'achat des marchandises vendues" valeur={-camv} indent />
            <LigneCR label="Marge brute" valeur={margebrute} bold separator />
            <LigneCR label="Commissions plateformes" valeur={-commissionsPlateformes} indent />
            <LigneCR label="Abonnements" valeur={-coutAbonnements} indent />
            <LigneCR label="Dépenses professionnelles" valeur={-totalDepenses} indent />
            <LigneCR label="Résultat d'exploitation" valeur={resultatExploitation} bold separator />
            <LigneCR label="IS estimé (15 % / 25 %)" valeur={-isEstime} indent />
            <LigneCR label="Résultat net estimé" valeur={resultatNet} bold separator positive={resultatNet >= 0} />
          </div>
          <p className="text-xs text-white/20 mt-4 italic">Estimation indicative — à valider avec votre expert-comptable</p>
        </div>

        {/* IS + KPIs */}
        <div className="space-y-4">
          <div className="bg-white/3 rounded-xl border border-white/5 p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Estimation IS — SAS</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Base imposable</span>
                <span className="text-white font-mono">{fmt(baseImposable)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Taux réduit 15 % (≤ {fmt(IS_PLAFOND_REDUIT)} €)</span>
                <span className="text-white/80 font-mono">{fmt(isPartReduite)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Taux normal 25 %</span>
                <span className="text-white/80 font-mono">{fmt(isPartNormale)} €</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-2.5">
                <span className="text-white font-semibold">IS total estimé</span>
                <span className="text-orange-400 font-bold font-mono">{fmt(isEstime)} €</span>
              </div>
              {baseImposable === 0 && (
                <p className="text-xs text-white/30 italic">Résultat nul ou négatif — pas d'IS dû.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/3 rounded-xl border border-white/5 p-4">
              <p className="text-xs text-white/40 mb-1">CA période</p>
              <p className="text-lg font-bold text-white">{fmt(ca)} €</p>
              <p className="text-xs text-white/30">{vendus.length} vente{vendus.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white/3 rounded-xl border border-white/5 p-4">
              <p className="text-xs text-white/40 mb-1">Marge brute</p>
              <p className={`text-lg font-bold ${margebrute >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(margebrute)} €</p>
              <p className="text-xs text-white/30">{ca > 0 ? ((margebrute / ca) * 100).toFixed(1) : 0} % du CA</p>
            </div>
            <div className="bg-white/3 rounded-xl border border-white/5 p-4">
              <p className="text-xs text-white/40 mb-1">Dépenses pro</p>
              <p className="text-lg font-bold text-white">{fmt(totalDepenses)} €</p>
              <p className="text-xs text-white/30">{depensesPeriode.length} dépense{depensesPeriode.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white/3 rounded-xl border border-white/5 p-4">
              <p className="text-xs text-white/40 mb-1">Résultat net</p>
              <p className={`text-lg font-bold ${resultatNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(resultatNet)} €</p>
              <p className="text-xs text-white/30">après IS estimé</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dépenses professionnelles */}
      <div className="bg-white/3 rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Dépenses professionnelles</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {depensesPeriode.length} dépense{depensesPeriode.length !== 1 ? 's' : ''} · {fmt(totalDepenses)} €
            </p>
          </div>
          <button
            onClick={() => setModalDepense({ open: true, depense: null })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-sm text-purple-400 hover:bg-purple-600/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </button>
        </div>

        {depensesPeriode.length > 0 ? (
          <>
            {/* Répartition par catégorie */}
            {depensesParCategorie.length > 1 && (
              <div className="px-5 pb-4 flex flex-wrap gap-2">
                {depensesParCategorie.map(({ categorie, montant }) => (
                  <span key={categorie} className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/50">
                    {categorie} — <span className="text-white/70">{fmt(montant)} €</span>
                  </span>
                ))}
              </div>
            )}
            <div className="border-t border-white/5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-white/40 border-b border-white/5">
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-left px-3 py-3 font-medium">Catégorie</th>
                    <th className="text-left px-3 py-3 font-medium hidden sm:table-cell">Description</th>
                    <th className="text-right px-5 py-3 font-medium">Montant</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {depensesPeriode.map(d => (
                    <tr key={d.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3 text-white/60 whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3 text-white/80">{d.categorie}</td>
                      <td className="px-3 py-3 text-white/40 hidden sm:table-cell">{d.description ?? '—'}</td>
                      <td className="px-5 py-3 text-right font-mono text-white">{fmt(d.montant)} €</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setModalDepense({ open: true, depense: d })}
                            title="Modifier"
                            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => supprimerDepense(d.id)}
                            title="Supprimer"
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10">
                    <td colSpan={3} className="px-5 py-3 text-xs text-white/40 font-medium">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-white font-mono">{fmt(totalDepenses)} €</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <div className="px-5 pb-5 text-sm text-white/30 text-center py-4">
            Aucune dépense sur cette période.{' '}
            <button onClick={() => setModalDepense({ open: true, depense: null })} className="text-purple-400 hover:text-purple-300 transition-colors">
              Ajouter la première
            </button>
          </div>
        )}
      </div>

      {/* Charges déductibles (frais commandes + commissions + abonnements) */}
      <div className="bg-white/3 rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setOpenSection(openSection === 'charges' ? null : 'charges')}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-white">Autres charges déductibles</h2>
            <p className="text-xs text-white/40 mt-0.5">Frais commandes · Commissions plateformes · Abonnements</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 text-white/40 transition-transform ${openSection === 'charges' ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {openSection === 'charges' && (
          <div className="border-t border-white/5 p-5 space-y-6">

            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Frais de commandes (prorata articles vendus)</h3>
              {fraisCommandesDetail.length === 0 ? (
                <p className="text-sm text-white/30">Aucun frais sur les commandes de cette période.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-white/40 border-b border-white/5">
                      <th className="text-left pb-2 font-medium">Fournisseur</th>
                      <th className="text-right pb-2 font-medium">Frais totaux</th>
                      <th className="text-right pb-2 font-medium">Imputés (prorata)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {fraisCommandesDetail.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2 text-white/70">{r.fournisseur}</td>
                        <td className="py-2 text-right text-white/50 font-mono">{fmt(r.fraisTotaux)} €</td>
                        <td className="py-2 text-right text-white font-mono">{fmt(r.fraisImputés)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Commissions plateformes</h3>
              {commissionsPlateforme.length === 0 ? (
                <p className="text-sm text-white/30">Aucune commission sur cette période.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-white/40 border-b border-white/5">
                      <th className="text-left pb-2 font-medium">Plateforme</th>
                      <th className="text-right pb-2 font-medium">Nb ventes</th>
                      <th className="text-right pb-2 font-medium">Commissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {commissionsPlateforme.map((p, i) => (
                      <tr key={i}>
                        <td className="py-2 text-white/70">{p.plateforme}</td>
                        <td className="py-2 text-right text-white/50">{p.nb}</td>
                        <td className="py-2 text-right text-white font-mono">{fmt(p.frais)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Abonnements de la période</h3>
              {abonnementsPeriode.length === 0 ? (
                <p className="text-sm text-white/30">Aucun abonnement sur cette période.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-white/40 border-b border-white/5">
                      <th className="text-left pb-2 font-medium">Mois</th>
                      <th className="text-right pb-2 font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {abonnementsPeriode.map((a, i) => (
                      <tr key={i}>
                        <td className="py-2 text-white/70">{a.mois}</td>
                        <td className="py-2 text-right text-white font-mono">{fmt(a.montant)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal dépense */}
      {modalDepense.open && (
        <ModalDepense
          depense={modalDepense.depense}
          onClose={() => setModalDepense({ open: false })}
          onSaved={() => {
            setModalDepense({ open: false })
            fetchAll()
          }}
        />
      )}
    </div>
  )
}
