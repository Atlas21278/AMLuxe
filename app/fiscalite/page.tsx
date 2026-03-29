'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import type { Article, Commande, Frais, AbonnementMensuel } from '@prisma/client'

type ArticleAvecCommande = Article & { commande: Commande & { frais: Frais[] } }
type Periode = 'mois' | 'trimestre' | 'annee' | 'perso'

// Seuils TVA franchise en base 2024 (achat/revente de biens)
const SEUIL_TVA = 36800
const SEUIL_TVA_TOLERANCE = 39100

// IS SAS : 15 % jusqu'à 42 500 €, 25 % au-delà
const IS_TAUX_REDUIT = 0.15
const IS_TAUX_NORMAL = 0.25
const IS_PLAFOND_REDUIT = 42500

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
  if (periode === 'mois') return {
    debut: new Date(now.getFullYear(), now.getMonth(), 1),
    fin: now,
  }
  if (periode === 'trimestre') {
    const trimestre = Math.floor(now.getMonth() / 3)
    return {
      debut: new Date(now.getFullYear(), trimestre * 3, 1),
      fin: now,
    }
  }
  if (periode === 'annee') return {
    debut: new Date(now.getFullYear(), 0, 1),
    fin: now,
  }
  // perso
  return {
    debut: persoDebut ? new Date(persoDebut) : new Date(now.getFullYear(), 0, 1),
    fin: persoFin ? new Date(persoFin + 'T23:59:59') : now,
  }
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function LigneCR({ label, valeur, bold, indent, separator, positive }: {
  label: string
  valeur: number
  bold?: boolean
  indent?: boolean
  separator?: boolean
  positive?: boolean
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

export default function FiscalitePage() {
  const [articles, setArticles] = useState<ArticleAvecCommande[]>([])
  const [abonnements, setAbonnements] = useState<AbonnementMensuel[]>([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState<Periode>('annee')
  const [persoDebut, setPersoDebut] = useState('')
  const [persoFin, setPersoFin] = useState('')
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/articles').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/abonnements').then(r => r.ok ? r.json() : []),
    ]).then(([arts, abos]: [ArticleAvecCommande[], AbonnementMensuel[]]) => {
      setArticles(Array.isArray(arts) ? arts : [])
      setAbonnements(Array.isArray(abos) ? abos : [])
      setLoading(false)
    }).catch(() => {
      toast.error('Impossible de charger les données')
      setLoading(false)
    })
  }, [])

  const { debut, fin } = useMemo(
    () => getDebutPeriode(periode, persoDebut, persoFin),
    [periode, persoDebut, persoFin]
  )

  // ── Articles vendus dans la période (par dateVente) ───────────────────────────
  const vendus = useMemo(() =>
    articles.filter(a =>
      a.statut === 'Vendu' && a.prixVenteReel && a.dateVente &&
      new Date(a.dateVente) >= debut && new Date(a.dateVente) <= fin
    ),
    [articles, debut, fin]
  )

  // ── Chiffre d'affaires ────────────────────────────────────────────────────────
  const ca = useMemo(() => vendus.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0), [vendus])
  const commissionsPlateformes = useMemo(() => vendus.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0), [vendus])

  // ── Coût d'achat marchandises vendues ────────────────────────────────────────
  // prixAchat des articles vendus + frais commandes prorata vendus
  const totalParCommande = useMemo(() => {
    const map = new Map<number, number>()
    articles.forEach(a => map.set(a.commandeId, (map.get(a.commandeId) ?? 0) + 1))
    return map
  }, [articles])

  const { camv, fraisCommandesDetail } = useMemo(() => {
    const prixAchatTotal = vendus.reduce((acc, a) => acc + a.prixAchat, 0)

    // Frais commandes prorata : frais × (articles vendus dans période / total articles de la commande)
    const commandesVues = new Map<number, {
      count: number
      frais: number
      fournisseur: string
      totalFrais: number
    }>()

    vendus.forEach(a => {
      if (!commandesVues.has(a.commandeId)) {
        commandesVues.set(a.commandeId, {
          count: 0,
          frais: a.commande.frais.reduce((s, f) => s + f.montant, 0),
          fournisseur: a.commande.fournisseur ?? 'Inconnu',
          totalFrais: a.commande.frais.reduce((s, f) => s + f.montant, 0),
        })
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

    return {
      camv: prixAchatTotal + fraisTotal,
      fraisCommandesDetail: detail,
    }
  }, [vendus, totalParCommande])

  const margebrute = ca - camv

  // ── Abonnements filtrés par période ──────────────────────────────────────────
  const abonnementsPeriode = useMemo(() => {
    const mois = new Set(getMoisEntre(debut, fin))
    return abonnements.filter(a => mois.has(a.mois))
  }, [abonnements, debut, fin])

  const coutAbonnements = useMemo(() =>
    abonnementsPeriode.reduce((sum, a) => sum + a.montant, 0),
    [abonnementsPeriode]
  )

  const resultatExploitation = margebrute - commissionsPlateformes - coutAbonnements

  // ── IS estimé ────────────────────────────────────────────────────────────────
  const baseImposable = Math.max(0, resultatExploitation)
  const isPartReduite = Math.min(baseImposable, IS_PLAFOND_REDUIT) * IS_TAUX_REDUIT
  const isPartNormale = Math.max(0, baseImposable - IS_PLAFOND_REDUIT) * IS_TAUX_NORMAL
  const isEstime = isPartReduite + isPartNormale
  const resultatNet = resultatExploitation - isEstime

  // ── TVA — CA annuel civil ─────────────────────────────────────────────────────
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

  // ── Label période ─────────────────────────────────────────────────────────────
  const labelPeriode = useMemo(() => {
    const d = debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    const f = fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${d} → ${f}`
  }, [debut, fin])

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExportLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // En-tête
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

      // Compte de résultat
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
          ['RÉSULTAT D\'EXPLOITATION', fmt(resultatExploitation)],
          ['  IS estimé', `−${fmt(isEstime)}`],
          ['RÉSULTAT NET ESTIMÉ', fmt(resultatNet)],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [124, 58, 237] },
        bodyStyles: { textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        didParseCell: (data) => {
          if ([2, 5, 7].includes(data.row.index) && data.section === 'body') {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })

      const y1 = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

      // IS
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Détail estimation IS', 14, y1)

      autoTable(doc, {
        startY: y1 + 4,
        head: [['Calcul', 'Montant (€)']],
        body: [
          ['Base imposable', fmt(baseImposable)],
          [`Taux réduit 15 % (≤ ${fmt(IS_PLAFOND_REDUIT)} €)`, fmt(isPartReduite)],
          ['Taux normal 25 %', fmt(isPartNormale)],
          ['IS total estimé', fmt(isEstime)],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [124, 58, 237] },
      })

      const y2 = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

      // Charges
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Détail des charges déductibles', 14, y2)

      autoTable(doc, {
        startY: y2 + 4,
        head: [['Fournisseur', 'Frais totaux commande', 'Frais imputés (prorata vendus)']],
        body: fraisCommandesDetail.map(r => [r.fournisseur, fmt(r.fraisTotaux) + ' €', fmt(r.fraisImputés) + ' €']),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [124, 58, 237] },
      })

      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text('Estimation indicative — à valider avec votre expert-comptable', 14, 285)

      const nomFichier = `AMLuxe_ComptesResultat_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(nomFichier)
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

      // Compte de résultat
      const cr = utils.aoa_to_sheet([
        [`Compte de résultat — ${labelPeriode}`],
        [],
        ['Ligne', 'Montant (€)'],
        ['Chiffre d\'affaires', ca],
        ['Coût d\'achat des marchandises vendues', -camv],
        ['MARGE BRUTE', margebrute],
        ['Commissions plateformes', -commissionsPlateformes],
        ['Abonnements', -coutAbonnements],
        ['RÉSULTAT D\'EXPLOITATION', resultatExploitation],
        ['IS estimé', -isEstime],
        ['RÉSULTAT NET ESTIMÉ', resultatNet],
      ])
      utils.book_append_sheet(wb, cr, 'Compte de résultat')

      // Charges détail
      const charges = utils.aoa_to_sheet([
        ['Fournisseur', 'Frais totaux commande (€)', 'Frais imputés (€)'],
        ...fraisCommandesDetail.map(r => [r.fournisseur, r.fraisTotaux, r.fraisImputés]),
        [],
        ['Plateformes', 'Commissions (€)', 'Nb ventes'],
        ...commissionsPlateforme.map(p => [p.plateforme, p.frais, p.nb]),
        [],
        ['Abonnements', 'Mois', 'Montant (€)'],
        ...abonnementsPeriode.map(a => [a.mois, a.mois, a.montant]),
      ])
      utils.book_append_sheet(wb, charges, 'Charges déductibles')

      // IS
      const is = utils.aoa_to_sheet([
        ['Calcul IS', 'Montant (€)'],
        ['Base imposable', baseImposable],
        [`Taux réduit 15 % (≤ ${IS_PLAFOND_REDUIT} €)`, isPartReduite],
        ['Taux normal 25 %', isPartNormale],
        ['IS total estimé', isEstime],
      ])
      utils.book_append_sheet(wb, is, 'IS estimé')

      const nomFichier = `AMLuxe_Fiscalite_${new Date().toISOString().split('T')[0]}.xlsx`
      writeFile(wb, nomFichier)
      toast.success('Excel exporté')
    } catch {
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setExportLoading(false)
    }
  }

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

  const PERIODES: { value: Periode; label: string }[] = [
    { value: 'mois', label: 'Ce mois' },
    { value: 'trimestre', label: 'Ce trimestre' },
    { value: 'annee', label: 'Cette année' },
    { value: 'perso', label: 'Personnalisé' },
  ]

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

      {/* Sélecteur de période */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PERIODES.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriode(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                periode === p.value
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-400'
                  : 'border-white/10 text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periode === 'perso' && (
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="date"
              value={persoDebut}
              onChange={e => setPersoDebut(e.target.value)}
              className="bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/60"
            />
            <span className="text-white/40 text-sm">→</span>
            <input
              type="date"
              value={persoFin}
              onChange={e => setPersoFin(e.target.value)}
              className="bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/60"
            />
          </div>
        )}
      </div>

      {/* Bannière TVA */}
      <div className={`rounded-xl border p-4 ${
        alerteTVA === 'depassement'
          ? 'bg-red-500/10 border-red-500/30'
          : alerteTVA === 'attention'
          ? 'bg-orange-500/10 border-orange-500/30'
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
              {' / '}seuil <span className="text-white/60">{fmt(SEUIL_TVA)} €</span>
              {' '}(tolérance {fmt(SEUIL_TVA_TOLERANCE)} €)
            </p>
          </div>
          <div className="sm:w-48 shrink-0">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>0 €</span>
              <span>{fmt(SEUIL_TVA)} €</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  alerteTVA === 'depassement' ? 'bg-red-500' : alerteTVA === 'attention' ? 'bg-orange-400' : 'bg-green-500'
                }`}
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
            <LigneCR label="Résultat d'exploitation" valeur={resultatExploitation} bold separator />
            <LigneCR label="IS estimé (15 % / 25 %)" valeur={-isEstime} indent />
            <LigneCR
              label="Résultat net estimé"
              valeur={resultatNet}
              bold
              separator
              positive={resultatNet >= 0}
            />
          </div>

          <p className="text-xs text-white/20 mt-4 italic">
            Estimation indicative — à valider avec votre expert-comptable
          </p>
        </div>

        {/* IS détail + KPIs rapides */}
        <div className="space-y-4">

          {/* IS */}
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
              <div className="flex justify-between text-sm border-t border-white/10 pt-2.5 mt-1">
                <span className="text-white font-semibold">IS total estimé</span>
                <span className="text-orange-400 font-bold font-mono">{fmt(isEstime)} €</span>
              </div>
              {baseImposable === 0 && (
                <p className="text-xs text-white/30 italic">Résultat nul ou négatif — pas d'IS dû.</p>
              )}
            </div>
          </div>

          {/* KPIs */}
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
              <p className="text-xs text-white/40 mb-1">Charges totales</p>
              <p className="text-lg font-bold text-white">{fmt(camv + commissionsPlateformes + coutAbonnements)} €</p>
              <p className="text-xs text-white/30">achats + frais + abo</p>
            </div>
            <div className="bg-white/3 rounded-xl border border-white/5 p-4">
              <p className="text-xs text-white/40 mb-1">Résultat net</p>
              <p className={`text-lg font-bold ${resultatNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(resultatNet)} €</p>
              <p className="text-xs text-white/30">après IS estimé</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charges déductibles — sections expandables */}
      <div className="bg-white/3 rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setOpenSection(openSection === 'charges' ? null : 'charges')}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-white">Détail des charges déductibles</h2>
            <p className="text-xs text-white/40 mt-0.5">Frais commandes · Commissions · Abonnements</p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 text-white/40 transition-transform ${openSection === 'charges' ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {openSection === 'charges' && (
          <div className="border-t border-white/5 p-5 space-y-6">

            {/* Frais commandes */}
            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Frais de commandes (prorata articles vendus)</h3>
              {fraisCommandesDetail.length === 0 ? (
                <p className="text-sm text-white/30">Aucun frais sur les commandes de cette période.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-white/40 border-b border-white/5">
                        <th className="text-left pb-2 font-medium">Fournisseur</th>
                        <th className="text-right pb-2 font-medium">Frais totaux commande</th>
                        <th className="text-right pb-2 font-medium">Frais imputés (prorata)</th>
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
                    <tfoot>
                      <tr className="border-t border-white/10">
                        <td className="pt-2 text-xs text-white/40 font-medium">Total</td>
                        <td />
                        <td className="pt-2 text-right font-bold text-white font-mono">{fmt(fraisCommandesDetail.reduce((a, r) => a + r.fraisImputés, 0))} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Commissions plateformes */}
            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Commissions plateformes</h3>
              {commissionsPlateforme.length === 0 ? (
                <p className="text-sm text-white/30">Aucune commission sur cette période.</p>
              ) : (
                <div className="overflow-x-auto">
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
                    <tfoot>
                      <tr className="border-t border-white/10">
                        <td className="pt-2 text-xs text-white/40 font-medium">Total</td>
                        <td className="pt-2 text-right text-white/50">{vendus.length}</td>
                        <td className="pt-2 text-right font-bold text-white font-mono">{fmt(commissionsPlateformes)} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Abonnements */}
            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Abonnements de la période</h3>
              {abonnementsPeriode.length === 0 ? (
                <p className="text-sm text-white/30">Aucun abonnement sur cette période.</p>
              ) : (
                <div className="overflow-x-auto">
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
                    <tfoot>
                      <tr className="border-t border-white/10">
                        <td className="pt-2 text-xs text-white/40 font-medium">Total</td>
                        <td className="pt-2 text-right font-bold text-white font-mono">{fmt(coutAbonnements)} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
