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
    ? (valeur >= 0 ? 'text-red-100' : 'text-red-400')
    : (positive ? 'text-green-400' : 'text-red-400')
  return (
    <div className={`flex items-center justify-between py-2.5 ${separator ? 'border-t border-red-500/30 mt-1' : ''} ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-red-200/80'}`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? 'font-bold ' + couleur : 'text-red-100/90'}`}>
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
      toast.success(depense ? 'Charge enregistrée' : 'Charge déclarée')
      onSaved()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-black/60 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-100 placeholder-red-900/60 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0d0000] border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl shadow-red-900/50"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 0 40px rgba(220,38,38,0.2), inset 0 0 40px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-red-500/20">
          <div>
            <p className="text-xs text-red-500/60 font-mono uppercase tracking-widest mb-0.5">⚠ Déclaration obligatoire</p>
            <h2 className="text-sm font-bold text-red-100">{depense ? 'Modifier la charge' : 'Déclarer une charge'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-red-400/70 mb-1.5">Date *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-red-400/70 mb-1.5">Montant (€) *</label>
              <input type="number" step="0.01" min="0" required placeholder="0.00" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-red-400/70 mb-1.5">Catégorie *</label>
            <select required value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className={inputClass}>
              {CATEGORIES_DEPENSE.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-red-400/70 mb-1.5">Description</label>
            <input type="text" placeholder="Justificatif requis en cas de contrôle" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-red-500/20 text-sm text-red-300/60 hover:bg-red-500/10 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-sm font-bold text-white transition-colors">
              {saving ? 'Enregistrement...' : (depense ? 'Modifier' : 'Déclarer')}
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
  const [introReady, setIntroReady] = useState(false)
  const [introProgress, setIntroProgress] = useState(0)
  const [periode, setPeriode] = useState<Periode>('annee')
  const [persoDebut, setPersoDebut] = useState('')
  const [persoFin, setPersoFin] = useState('')
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [modalDepense, setModalDepense] = useState<{ open: boolean; depense?: DepensePro | null }>({ open: false })
  const [tick, setTick] = useState(0)

  // Intro : durée fixe de 3s, progress animée, révèle la page seulement quand les deux sont prêts
  useEffect(() => {
    const DUREE = 3000
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / DUREE) * 100)
      setIntroProgress(pct)
      if (pct >= 100) {
        clearInterval(interval)
        setIntroReady(true)
      }
    }, 30)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

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

  const { debut, fin } = useMemo(() => getDebutPeriode(periode, persoDebut, persoFin), [periode, persoDebut, persoFin])

  const vendus = useMemo(() =>
    articles.filter(a => a.statut === 'Vendu' && a.prixVenteReel && a.dateVente && new Date(a.dateVente) >= debut && new Date(a.dateVente) <= fin),
    [articles, debut, fin]
  )

  const ca = useMemo(() => vendus.reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0), [vendus])
  const commissionsPlateformes = useMemo(() => vendus.reduce((acc, a) => acc + (a.fraisVente ?? 0), 0), [vendus])

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

  const abonnementsPeriode = useMemo(() => {
    const mois = new Set(getMoisEntre(debut, fin))
    return abonnements.filter(a => mois.has(a.mois))
  }, [abonnements, debut, fin])

  const coutAbonnements = useMemo(() => abonnementsPeriode.reduce((sum, a) => sum + a.montant, 0), [abonnementsPeriode])

  const depensesPeriode = useMemo(() =>
    depenses.filter(d => { const date = new Date(d.date); return date >= debut && date <= fin }),
    [depenses, debut, fin]
  )

  const totalDepenses = useMemo(() => depensesPeriode.reduce((sum, d) => sum + d.montant, 0), [depensesPeriode])

  const depensesParCategorie = useMemo(() => {
    const map = new Map<string, number>()
    depensesPeriode.forEach(d => map.set(d.categorie, (map.get(d.categorie) ?? 0) + d.montant))
    return Array.from(map.entries()).map(([categorie, montant]) => ({ categorie, montant })).sort((a, b) => b.montant - a.montant)
  }, [depensesPeriode])

  const resultatExploitation = margebrute - commissionsPlateformes - coutAbonnements - totalDepenses
  const baseImposable = Math.max(0, resultatExploitation)
  const isPartReduite = Math.min(baseImposable, IS_PLAFOND_REDUIT) * IS_TAUX_REDUIT
  const isPartNormale = Math.max(0, baseImposable - IS_PLAFOND_REDUIT) * IS_TAUX_NORMAL
  const isEstime = isPartReduite + isPartNormale
  const resultatNet = resultatExploitation - isEstime

  const caAnnuelCivil = useMemo(() => {
    const debutAnnee = new Date(new Date().getFullYear(), 0, 1)
    return articles.filter(a => a.statut === 'Vendu' && a.prixVenteReel && a.dateVente && new Date(a.dateVente) >= debutAnnee).reduce((acc, a) => acc + (a.prixVenteReel ?? 0), 0)
  }, [articles])

  const pctTVA = Math.min(100, (caAnnuelCivil / SEUIL_TVA) * 100)
  const alerteTVA = caAnnuelCivil >= SEUIL_TVA_TOLERANCE ? 'depassement' : caAnnuelCivil >= SEUIL_TVA * 0.8 ? 'attention' : null

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
    return `${d} — ${f}`
  }, [debut, fin])

  const supprimerDepense = async (id: number) => {
    if (!confirm('Supprimer cette charge ?')) return
    const res = await fetch(`/api/depenses/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Charge supprimée'); fetchAll() }
    else toast.error('Erreur lors de la suppression')
  }

  const exportPDF = async () => {
    setExportLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      doc.setFillColor(120, 0, 0)
      doc.rect(0, 0, 210, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('URSSAF — Compte de résultat', 14, 12)
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
        headStyles: { fillColor: [120, 0, 0] },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        didParseCell: (data) => {
          if ([2, 6, 8].includes(data.row.index) && data.section === 'body') data.cell.styles.fontStyle = 'bold'
        },
      })
      const getY = () => (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      doc.setFontSize(12); doc.setFont('helvetica', 'bold')
      doc.text('Dépenses professionnelles', 14, getY())
      autoTable(doc, {
        startY: getY() + 4 - 10,
        head: [['Date', 'Catégorie', 'Description', 'Montant (€)']],
        body: depensesPeriode.map(d => [new Date(d.date).toLocaleDateString('fr-FR'), d.categorie, d.description ?? '', fmt(d.montant)]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [120, 0, 0] },
        foot: [['', '', 'Total', fmt(totalDepenses)]],
        footStyles: { fontStyle: 'bold' },
      })
      doc.setFontSize(7); doc.setTextColor(120, 0, 0)
      doc.text('Document confidentiel — URSSAF — Estimation à valider avec votre expert-comptable', 14, 285)
      doc.save(`URSSAF_ComptesResultat_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Document généré')
    } catch { toast.error('Erreur export') } finally { setExportLoading(false) }
  }

  const exportExcel = async () => {
    setExportLoading(true)
    try {
      const { utils, writeFile } = await import('xlsx')
      const wb = utils.book_new()
      const cr = utils.aoa_to_sheet([
        [`URSSAF — Compte de résultat — ${labelPeriode}`], [],
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
        ...depensesPeriode.map(d => [new Date(d.date).toLocaleDateString('fr-FR'), d.categorie, d.description ?? '', d.montant]),
        [], ['', '', 'Total', totalDepenses],
      ])
      utils.book_append_sheet(wb, deps, 'Dépenses pro')
      writeFile(wb, `URSSAF_Fiscalite_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Export généré')
    } catch { toast.error('Erreur export') } finally { setExportLoading(false) }
  }

  const PERIODES: { value: Periode; label: string }[] = [
    { value: 'mois', label: 'Ce mois' },
    { value: 'trimestre', label: 'Trimestre' },
    { value: 'annee', label: 'Cette année' },
    { value: 'perso', label: 'Personnalisé' },
  ]

  const dossierNum = useMemo(() => `${new Date().getFullYear()}-${String(Math.abs(Math.sin(Date.now() / 1e10) * 999999 | 0)).padStart(6, '0')}`, [])

  if (loading || !introReady) {
    const steps = [
      { threshold: 0,  label: 'INITIALISATION DU CONTRÔLE...' },
      { threshold: 15, label: 'ACCÈS AU DOSSIER FISCAL...' },
      { threshold: 30, label: 'ANALYSE DES REVENUS DÉCLARÉS...' },
      { threshold: 50, label: 'VÉRIFICATION DES COTISATIONS...' },
      { threshold: 70, label: 'CALCUL DES MAJORATIONS ÉVENTUELLES...' },
      { threshold: 88, label: 'COMPILATION DU RAPPORT...' },
      { threshold: 97, label: 'ACCÈS AUTORISÉ.' },
    ]
    const currentLabel = [...steps].reverse().find(s => introProgress >= s.threshold)?.label ?? steps[0].label

    return (
      <>
        <style>{urssafStyles}</style>
        <div className="min-h-screen bg-[#080001] flex items-center justify-center urssaf-grid relative overflow-hidden">
          <div className="absolute inset-0 urssaf-scanline pointer-events-none" />
          <div className="absolute inset-0 urssaf-vignette pointer-events-none" />

          <div className="relative z-10 text-center space-y-8 w-full max-w-sm px-8">
            {/* Logo */}
            <div>
              <div
                className="text-5xl font-black tracking-[0.3em] text-red-500 urssaf-glitch mb-2"
                data-text="URSSAF"
              >
                URSSAF
              </div>
              <p className="text-xs font-mono text-red-400/50 tracking-widest uppercase">
                Contrôle fiscal automatisé
              </p>
            </div>

            {/* Barre de progression */}
            <div className="space-y-3">
              <div className="h-px w-full bg-red-900/30 relative overflow-hidden rounded">
                <div
                  className="absolute left-0 top-0 h-full bg-red-600 transition-none rounded"
                  style={{ width: `${introProgress}%`, boxShadow: '0 0 8px rgba(220,38,38,0.8)' }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-red-900/60">
                <span className="text-red-500/60 urssaf-blink">▶</span>
                <span className="text-red-400/80">{Math.round(introProgress)}%</span>
              </div>
            </div>

            {/* Étape courante */}
            <div className="h-6">
              <p className="text-xs font-mono text-red-400/80 tracking-widest">
                {currentLabel}
              </p>
            </div>

            {/* Log lignes fausses */}
            <div className="text-left border border-red-900/20 rounded bg-black/40 p-3 space-y-1">
              {steps.filter(s => introProgress >= s.threshold).slice(-4).map((s, i) => (
                <p key={i} className="text-xs font-mono text-red-900/60">
                  <span className="text-red-800/60">[{new Date().toLocaleTimeString('fr-FR')}]</span>{' '}
                  <span className={i === steps.filter(s2 => introProgress >= s2.threshold).length - 1 ? 'text-red-400/80' : 'text-red-900/50'}>
                    {s.label}
                  </span>
                </p>
              ))}
            </div>

            <p className="text-xs font-mono text-red-900/30 tracking-widest">
              NE PAS FERMER CETTE FENÊTRE
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{urssafStyles}</style>

      <div className="relative min-h-screen overflow-hidden">

      {/* Background animé — contenu dans la zone de page, pas fixed */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[#080001]" />
        <div className="absolute inset-0 urssaf-grid" />
        <div className="absolute inset-0 urssaf-scanline" />
        <div className="absolute inset-0 urssaf-vignette" />
        <div className="absolute inset-0 urssaf-noise" />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6">

        {/* En-tête URSSAF */}
        <div className="border border-red-500/30 rounded-xl bg-black/60 p-6 urssaf-card-glow">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="urssaf-blink w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-mono text-red-400 tracking-widest uppercase">Surveillance active</span>
                <span className="text-xs font-mono text-red-500/70 tracking-widest">· Dossier n°{dossierNum}</span>
              </div>
              <h1
                className="text-4xl sm:text-5xl font-black tracking-widest text-red-500 urssaf-glitch"
                data-text="URSSAF"
              >
                URSSAF
              </h1>
              <p className="text-xs text-red-300/70 font-mono tracking-widest mt-1 uppercase">
                Union de Recouvrement des Cotisations de Sécurité Sociale et d'Allocations Familiales
              </p>
              <p className="text-xs text-red-300/70 font-mono mt-2">{labelPeriode}</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-2 text-xs font-mono text-red-500/50">
                <span className="urssaf-blink">●</span>
                <span>{new Date().toLocaleTimeString('fr-FR')}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={exportExcel} disabled={exportLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-xs font-mono text-red-400/70 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  EXPORT.xlsx
                </button>
                <button onClick={exportPDF} disabled={exportLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-700/80 hover:bg-red-600 border border-red-500/50 text-xs font-mono text-white font-bold transition-colors disabled:opacity-30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  DOSSIER.pdf
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="border border-red-900/40 bg-black/40 rounded-lg overflow-hidden">
          <div className="urssaf-ticker whitespace-nowrap text-xs font-mono text-red-500/60 py-2">
            ⚠&nbsp;&nbsp;TOUT REVENU DOIT ÊTRE DÉCLARÉ &nbsp;·&nbsp; CONTRÔLE AUTOMATISÉ EN COURS &nbsp;·&nbsp; LES MANQUEMENTS SONT PASSIBLES DE MAJORATIONS &nbsp;·&nbsp; ART. L131-6 CODE DE LA SÉCURITÉ SOCIALE &nbsp;·&nbsp; DÉLAI DE PRESCRIPTION : 3 ANS &nbsp;·&nbsp; COTISATIONS OBLIGATOIRES &nbsp;·&nbsp; ⚠&nbsp;&nbsp;TOUT REVENU DOIT ÊTRE DÉCLARÉ &nbsp;·&nbsp; CONTRÔLE AUTOMATISÉ EN COURS &nbsp;·&nbsp; LES MANQUEMENTS SONT PASSIBLES DE MAJORATIONS &nbsp;·&nbsp;
          </div>
        </div>

        {/* Sélecteur période */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-red-500/50 uppercase tracking-widest">// Période d'analyse</p>
          <div className="flex flex-wrap gap-2">
            {PERIODES.map(p => (
              <button key={p.value} onClick={() => setPeriode(p.value)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all ${
                  periode === p.value
                    ? 'bg-red-700/40 border-red-500/60 text-red-300 urssaf-card-glow'
                    : 'border-red-900/40 text-red-500/40 hover:border-red-500/40 hover:text-red-400 bg-black/20'
                }`}
              >{p.label.toUpperCase()}</button>
            ))}
          </div>
          {periode === 'perso' && (
            <div className="flex flex-wrap gap-3 items-center">
              <input type="date" value={persoDebut} onChange={e => setPersoDebut(e.target.value)}
                className="bg-black/60 border border-red-500/30 rounded px-3 py-2 text-xs font-mono text-red-200 focus:outline-none focus:border-red-500" />
              <span className="text-red-500/40 text-xs font-mono">→</span>
              <input type="date" value={persoFin} onChange={e => setPersoFin(e.target.value)}
                className="bg-black/60 border border-red-500/30 rounded px-3 py-2 text-xs font-mono text-red-200 focus:outline-none focus:border-red-500" />
            </div>
          )}
        </div>

        {/* Alerte TVA */}
        <div className={`rounded-xl border p-4 ${
          alerteTVA === 'depassement' ? 'bg-red-900/30 border-red-500/60 urssaf-card-glow'
          : alerteTVA === 'attention' ? 'bg-red-900/20 border-red-500/40'
          : 'bg-black/40 border-red-900/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {alerteTVA ? (
                  <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${alerteTVA === 'depassement' ? 'bg-red-500 text-white urssaf-blink' : 'bg-red-800/60 text-red-300'}`}>
                    {alerteTVA === 'depassement' ? '🚨 SEUIL TVA FRANCHI' : '⚠ SEUIL TVA APPROCHE'}
                  </span>
                ) : (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-900/20 text-red-500/60 border border-red-900/40">
                    FRANCHISE EN BASE — ART. 293B CGI
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-red-400/40 mt-1">
                CA {new Date().getFullYear()} déclaré : <span className="text-red-300 font-bold">{fmt(caAnnuelCivil)} €</span>
                <span className="text-red-900/60 mx-2">/</span>
                Seuil légal : <span className="text-red-400/60">{fmt(SEUIL_TVA)} €</span>
                <span className="text-red-900/60 mx-1">(tolérance {fmt(SEUIL_TVA_TOLERANCE)} €)</span>
              </p>
            </div>
            <div className="sm:w-52 shrink-0">
              <div className="flex justify-between text-xs font-mono text-red-900/60 mb-1">
                <span>0 €</span><span className="text-red-500/50">{fmt(SEUIL_TVA)} €</span>
              </div>
              <div className="h-3 rounded bg-red-900/20 border border-red-900/40 overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-1000 ${alerteTVA === 'depassement' ? 'bg-red-500 urssaf-blink' : alerteTVA === 'attention' ? 'bg-red-600' : 'bg-red-800'}`}
                  style={{ width: `${pctTVA}%` }}
                />
              </div>
              <p className="text-xs font-mono text-red-500/40 mt-1 text-right">{pctTVA.toFixed(1)}% du seuil</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Compte de résultat */}
          <div className="border border-red-500/20 rounded-xl bg-black/50 p-5 urssaf-card-hover">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-red-600 rounded" />
              <h2 className="text-xs font-black font-mono text-red-300 tracking-widest uppercase">Compte de résultat</h2>
            </div>
            <p className="text-xs font-mono text-red-900/60 mb-4 pl-3">Exercice : {labelPeriode}</p>
            <div className="divide-y divide-red-900/30">
              <LigneCR label="Chiffre d'affaires" valeur={ca} />
              <LigneCR label="Coût d'achat marchandises vendues" valeur={-camv} indent />
              <LigneCR label="— Marge brute" valeur={margebrute} bold separator />
              <LigneCR label="Commissions plateformes" valeur={-commissionsPlateformes} indent />
              <LigneCR label="Abonnements" valeur={-coutAbonnements} indent />
              <LigneCR label="Dépenses professionnelles" valeur={-totalDepenses} indent />
              <LigneCR label="— Résultat d'exploitation" valeur={resultatExploitation} bold separator />
              <LigneCR label="IS estimé (15 % / 25 %)" valeur={-isEstime} indent />
              <LigneCR label="— Résultat net estimé" valeur={resultatNet} bold separator positive={resultatNet >= 0} />
            </div>
            <p className="text-xs font-mono text-red-400/60 mt-4 italic border-t border-red-900/30 pt-3">
              ⚠ Estimation indicative — conservez tous vos justificatifs
            </p>
          </div>

          {/* IS + KPIs */}
          <div className="space-y-4">
            <div className="border border-red-500/20 rounded-xl bg-black/50 p-5 urssaf-card-hover">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-red-600 rounded" />
                <h2 className="text-xs font-black font-mono text-red-300 tracking-widest uppercase">Impôt sur les Sociétés — SAS</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-red-200/80 font-mono text-xs">Base imposable</span>
                  <span className="text-red-200 font-mono font-bold">{fmt(baseImposable)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-200/80 font-mono text-xs">Taux réduit 15 % (≤ {fmt(IS_PLAFOND_REDUIT)} €)</span>
                  <span className="text-red-300/70 font-mono">{fmt(isPartReduite)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-200/80 font-mono text-xs">Taux normal 25 %</span>
                  <span className="text-red-300/70 font-mono">{fmt(isPartNormale)} €</span>
                </div>
                <div className="flex justify-between border-t border-red-500/20 pt-3">
                  <span className="text-red-300 font-black font-mono text-sm">TOTAL IS DÛ</span>
                  <span className="text-red-400 font-black font-mono text-lg urssaf-pulse-text">{fmt(isEstime)} €</span>
                </div>
                {baseImposable === 0 && (
                  <p className="text-xs font-mono text-red-900/60 italic">Résultat non imposable — surveillance maintenue.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'CA PÉRIODE', value: fmt(ca) + ' €', sub: `${vendus.length} vente${vendus.length !== 1 ? 's' : ''}` },
                { label: 'MARGE BRUTE', value: fmt(margebrute) + ' €', sub: ca > 0 ? `${((margebrute / ca) * 100).toFixed(1)}% du CA` : '—', color: margebrute >= 0 },
                { label: 'CHARGES PRO', value: fmt(totalDepenses) + ' €', sub: `${depensesPeriode.length} déclaration${depensesPeriode.length !== 1 ? 's' : ''}` },
                { label: 'RÉSULTAT NET', value: fmt(resultatNet) + ' €', sub: 'après IS estimé', color: resultatNet >= 0 },
              ].map((kpi, i) => (
                <div key={i} className="border border-red-900/30 rounded-xl bg-black/40 p-4 urssaf-card-hover">
                  <p className="text-xs font-black font-mono text-red-400 tracking-widest mb-2">{kpi.label}</p>
                  <p className={`text-base font-black font-mono ${'color' in kpi ? (kpi.color ? 'text-green-500' : 'text-red-400') : 'text-red-200'}`}>
                    {kpi.value}
                  </p>
                  <p className="text-xs font-mono text-red-400/60 mt-1">{kpi.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dépenses professionnelles */}
        <div className="border border-red-500/20 rounded-xl bg-black/50 overflow-hidden urssaf-card-hover">
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-red-600 rounded" />
                <h2 className="text-xs font-black font-mono text-red-300 tracking-widest uppercase">Charges Déductibles Déclarées</h2>
              </div>
              <p className="text-xs font-mono text-red-400/70 pl-3">
                {depensesPeriode.length} charge{depensesPeriode.length !== 1 ? 's' : ''} · {fmt(totalDepenses)} € · Justificatifs requis
              </p>
            </div>
            <button
              onClick={() => setModalDepense({ open: true, depense: null })}
              className="flex items-center gap-2 px-3 py-2 rounded border border-red-500/40 bg-red-900/20 text-xs font-black font-mono text-red-400 hover:bg-red-900/40 transition-colors urssaf-card-glow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              DÉCLARER
            </button>
          </div>

          {depensesPeriode.length > 0 ? (
            <>
              {depensesParCategorie.length > 1 && (
                <div className="px-5 pb-4 flex flex-wrap gap-2">
                  {depensesParCategorie.map(({ categorie, montant }) => (
                    <span key={categorie} className="text-xs font-mono px-2 py-1 rounded bg-red-900/20 border border-red-900/30 text-red-400/50">
                      {categorie} <span className="text-red-300/60">— {fmt(montant)} €</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="border-t border-red-900/30 overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-red-300/80 border-b border-red-900/40 bg-black/30">
                      <th className="text-left px-5 py-3 font-bold tracking-widest">DATE</th>
                      <th className="text-left px-3 py-3 font-bold tracking-widest">CATÉGORIE</th>
                      <th className="text-left px-3 py-3 font-bold tracking-widest hidden sm:table-cell">DESCRIPTION</th>
                      <th className="text-right px-5 py-3 font-bold tracking-widest">MONTANT</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-900/20">
                    {depensesPeriode.map(d => (
                      <tr key={d.id} className="hover:bg-red-900/10 transition-colors">
                        <td className="px-5 py-3 text-red-300/50">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-3 py-3 text-red-100/90">{d.categorie}</td>
                        <td className="px-3 py-3 text-red-400/60 hidden sm:table-cell">{d.description ?? '—'}</td>
                        <td className="px-5 py-3 text-right text-red-300 font-bold">{fmt(d.montant)} €</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setModalDepense({ open: true, depense: d })} title="Modifier"
                              className="p-1.5 rounded text-red-900/60 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => supprimerDepense(d.id)} title="Supprimer"
                              className="p-1.5 rounded text-red-900/60 hover:text-red-500 hover:bg-red-900/20 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-red-500/20 bg-red-900/10">
                      <td colSpan={3} className="px-5 py-3 text-red-300/80 font-bold tracking-widest">TOTAL DÉCLARÉ</td>
                      <td className="px-5 py-3 text-right font-black text-red-300">{fmt(totalDepenses)} €</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="px-5 pb-6 text-center">
              <p className="text-xs font-mono text-red-900/50">Aucune charge déclarée pour cette période.</p>
              <button onClick={() => setModalDepense({ open: true, depense: null })} className="text-xs font-mono text-red-500/60 hover:text-red-400 transition-colors mt-1 underline">
                Effectuer une déclaration
              </button>
            </div>
          )}
        </div>

        {/* Autres charges */}
        <div className="border border-red-900/30 rounded-xl bg-black/40 overflow-hidden">
          <button
            onClick={() => setOpenSection(openSection === 'charges' ? null : 'charges')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-red-900/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-red-900 rounded" />
              <div>
                <h2 className="text-xs font-black font-mono text-red-300/80 tracking-widest uppercase">Autres charges déductibles</h2>
                <p className="text-xs font-mono text-red-400/70 mt-0.5">Frais commandes · Commissions · Abonnements</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-red-900/50 transition-transform ${openSection === 'charges' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openSection === 'charges' && (
            <div className="border-t border-red-900/30 p-5 space-y-6">
              {[
                {
                  title: 'Frais de commandes (prorata vendus)',
                  rows: fraisCommandesDetail,
                  cols: ['Fournisseur', 'Frais totaux', 'Imputés'],
                  render: (r: { fournisseur: string; fraisTotaux: number; fraisImputés: number }) => [r.fournisseur, fmt(r.fraisTotaux) + ' €', fmt(r.fraisImputés) + ' €'],
                  empty: 'Aucun frais commande.',
                },
              ].map(({ title, rows, cols, render, empty }) => (
                <div key={title}>
                  <h3 className="text-xs font-black font-mono text-red-300/80 uppercase tracking-widest mb-3">{title}</h3>
                  {rows.length === 0 ? <p className="text-xs font-mono text-red-400/60">{empty}</p> : (
                    <table className="w-full text-xs font-mono">
                      <thead><tr className="text-red-300/70 border-b border-red-900/40">
                        {cols.map(c => <th key={c} className="text-left pb-2 font-bold">{c}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-red-900/20">
                        {rows.map((r, i) => {
                          const cells = render(r as { fournisseur: string; fraisTotaux: number; fraisImputés: number })
                          return <tr key={i} className="hover:bg-red-900/10">
                            {cells.map((c, j) => <td key={j} className={`py-2 ${j > 0 ? 'text-right text-red-200/90' : 'text-red-200/50'}`}>{c}</td>)}
                          </tr>
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}

              <div>
                <h3 className="text-xs font-black font-mono text-red-300/80 uppercase tracking-widest mb-3">Commissions plateformes</h3>
                {commissionsPlateforme.length === 0 ? <p className="text-xs font-mono text-red-400/60">Aucune commission.</p> : (
                  <table className="w-full text-xs font-mono">
                    <thead><tr className="text-red-300/70 border-b border-red-900/40">
                      <th className="text-left pb-2 font-bold">Plateforme</th>
                      <th className="text-right pb-2 font-bold">Nb ventes</th>
                      <th className="text-right pb-2 font-bold">Commissions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-red-900/20">
                      {commissionsPlateforme.map((p, i) => (
                        <tr key={i} className="hover:bg-red-900/10">
                          <td className="py-2 text-red-200/85">{p.plateforme}</td>
                          <td className="py-2 text-right text-red-900/60">{p.nb}</td>
                          <td className="py-2 text-right text-red-200/90">{fmt(p.frais)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h3 className="text-xs font-black font-mono text-red-300/80 uppercase tracking-widest mb-3">Abonnements de la période</h3>
                {abonnementsPeriode.length === 0 ? <p className="text-xs font-mono text-red-400/60">Aucun abonnement.</p> : (
                  <table className="w-full text-xs font-mono">
                    <thead><tr className="text-red-300/70 border-b border-red-900/40">
                      <th className="text-left pb-2 font-bold">Mois</th>
                      <th className="text-right pb-2 font-bold">Montant</th>
                    </tr></thead>
                    <tbody className="divide-y divide-red-900/20">
                      {abonnementsPeriode.map((a, i) => (
                        <tr key={i} className="hover:bg-red-900/10">
                          <td className="py-2 text-red-200/85">{a.mois}</td>
                          <td className="py-2 text-right text-red-200/90">{fmt(a.montant)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-red-900/20">
          <p className="text-xs font-mono text-red-400/60 tracking-widest">
            URSSAF · DOCUMENT CONFIDENTIEL · {new Date().getFullYear()} · TOUTE OMISSION EST SUSCEPTIBLE DE POURSUITES
          </p>
        </div>

      </div>
      </div>{/* fin wrapper relatif */}

      {modalDepense.open && (
        <ModalDepense
          depense={modalDepense.depense}
          onClose={() => setModalDepense({ open: false })}
          onSaved={() => { setModalDepense({ open: false }); fetchAll() }}
        />
      )}
    </>
  )
}

// ── Styles CSS injectés ───────────────────────────────────────────────────────
const urssafStyles = `
  @keyframes urssaf-glitch {
    0%, 90%, 100% {
      text-shadow: none;
      transform: none;
      clip-path: none;
    }
    91% {
      text-shadow: 3px 0 #ff0000, -3px 0 #00ffff;
      transform: translateX(3px) skewX(-2deg);
    }
    92% {
      text-shadow: -3px 0 #ff0000, 3px 0 #00ffff;
      transform: translateX(-3px);
      clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
    }
    93% {
      text-shadow: 2px 0 #ff0000;
      transform: translateX(1px) skewX(1deg);
      clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
    }
    94% {
      text-shadow: -4px 0 #ff0000, 4px 0 #00ffff;
      transform: translateX(-2px);
      clip-path: none;
    }
    95% {
      text-shadow: none;
      transform: none;
    }
  }

  @keyframes urssaf-scanline {
    0% { transform: translateY(-100%); opacity: 0.04; }
    50% { opacity: 0.08; }
    100% { transform: translateY(100vh); opacity: 0.04; }
  }

  @keyframes urssaf-blink {
    0%, 49%, 100% { opacity: 1; }
    50%, 99% { opacity: 0; }
  }

  @keyframes urssaf-ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  @keyframes urssaf-pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
    50% { box-shadow: 0 0 12px 2px rgba(220,38,38,0.15); }
  }

  @keyframes urssaf-scan-bar {
    0% { width: 0%; }
    80% { width: 100%; }
    100% { width: 100%; }
  }

  @keyframes urssaf-flicker {
    0%, 97%, 100% { opacity: 1; }
    98% { opacity: 0.6; }
    99% { opacity: 0.9; }
  }

  @keyframes urssaf-pulse-text {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .urssaf-glitch {
    animation: urssaf-glitch 4s infinite, urssaf-flicker 8s infinite;
  }

  .urssaf-blink {
    animation: urssaf-blink 1s step-end infinite;
  }

  .urssaf-ticker {
    display: inline-block;
    animation: urssaf-ticker 30s linear infinite;
  }

  .urssaf-card-glow {
    animation: urssaf-pulse-glow 3s ease-in-out infinite;
  }

  .urssaf-card-hover {
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .urssaf-card-hover:hover {
    border-color: rgba(220,38,38,0.35);
    box-shadow: 0 0 20px rgba(220,38,38,0.08);
  }

  .urssaf-scan-bar {
    animation: urssaf-scan-bar 2s ease-in-out infinite;
  }

  .urssaf-pulse-text {
    animation: urssaf-pulse-text 2s ease-in-out infinite;
  }

  .urssaf-grid {
    background-image:
      linear-gradient(rgba(220,38,38,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(220,38,38,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .urssaf-scanline::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(transparent, rgba(220,38,38,0.03), transparent);
    animation: urssaf-scanline 6s linear infinite;
    pointer-events: none;
  }

  .urssaf-vignette {
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);
  }

  .urssaf-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    opacity: 0.4;
  }
`
