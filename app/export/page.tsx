'use client'

import { useState, useRef } from 'react'

interface PreviewCommande {
  fournisseur: string
  date: string
  statut: string
  tracking?: string
  articles: { marque: string; modele: string; prixAchat: number; etat: string }[]
  frais: { type: string; montant: number }[]
}

export default function ExportPage() {
  const [loadingExport, setLoadingExport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewCommande[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ nbCommandes: number; nbArticles: number; nbFrais: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── EXPORT ──────────────────────────────────────────────
  const exportGlobal = async () => {
    setLoadingExport(true)
    const [commandes, articles] = await Promise.all([
      fetch('/api/commandes').then((r) => r.json()),
      fetch('/api/articles').then((r) => r.json()),
    ])

    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const commandesData = commandes.map((c: {
      id: number; fournisseur: string; date: string; statut: string
      tracking: string | null; notes: string | null
      articles: { prixAchat: number }[]; frais: { montant: number }[]
    }) => ({
      ID: c.id,
      Fournisseur: c.fournisseur,
      Date: new Date(c.date).toLocaleDateString('fr-FR'),
      Statut: c.statut,
      Tracking: c.tracking ?? '',
      'Nb articles': c.articles.length,
      'Total achat (€)': c.articles.reduce((acc: number, a: { prixAchat: number }) => acc + a.prixAchat, 0).toFixed(2),
      'Total frais (€)': c.frais.reduce((acc: number, f: { montant: number }) => acc + f.montant, 0).toFixed(2),
      'Coût total (€)': (
        c.articles.reduce((acc: number, a: { prixAchat: number }) => acc + a.prixAchat, 0) +
        c.frais.reduce((acc: number, f: { montant: number }) => acc + f.montant, 0)
      ).toFixed(2),
      Notes: c.notes ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commandesData), 'Commandes')

    const articlesData = articles.map((a: {
      marque: string; modele: string; etat: string; refFournisseur: string | null
      statut: string; prixAchat: number; prixVente: number | null; plateforme: string | null
      prixVenteReel: number | null; fraisVente: number | null; dateVente: string | null
      commande: { fournisseur: string }
    }) => {
      const benefice = a.prixVenteReel ? a.prixVenteReel - (a.fraisVente ?? 0) - a.prixAchat : null
      return {
        Fournisseur: a.commande.fournisseur,
        Marque: a.marque,
        Modèle: a.modele,
        État: a.etat,
        'Réf. fournisseur': a.refFournisseur ?? '',
        Statut: a.statut,
        'Prix achat (€)': a.prixAchat.toFixed(2),
        'Prix vente affiché (€)': a.prixVente?.toFixed(2) ?? '',
        Plateforme: a.plateforme ?? '',
        'Prix vente réel (€)': a.prixVenteReel?.toFixed(2) ?? '',
        'Frais vente (€)': a.fraisVente?.toFixed(2) ?? '',
        'Bénéfice (€)': benefice?.toFixed(2) ?? '',
        'Marge (%)': a.prixVenteReel && benefice !== null ? ((benefice / a.prixVenteReel) * 100).toFixed(1) : '',
        'Date vente': a.dateVente ? new Date(a.dateVente).toLocaleDateString('fr-FR') : '',
      }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(articlesData), 'Articles')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Colonne: 'Fournisseur', Requis: 'Oui', Exemple: 'Fournisseur Paris' },
      { Colonne: 'Date', Requis: 'Oui', Exemple: '22/03/2026' },
      { Colonne: 'Statut', Requis: 'Non', Exemple: 'En préparation' },
      { Colonne: 'Tracking', Requis: 'Non', Exemple: '1Z999AA10123456784' },
      { Colonne: 'Marque', Requis: 'Oui (articles)', Exemple: 'Hermès' },
      { Colonne: 'Modèle', Requis: 'Oui (articles)', Exemple: 'Birkin 30' },
      { Colonne: 'Prix achat (€)', Requis: 'Oui (articles)', Exemple: '5000' },
      { Colonne: 'État', Requis: 'Non', Exemple: 'Très bon état' },
    ]), 'Guide import')

    XLSX.writeFile(wb, `AMLuxe_export_${new Date().toISOString().split('T')[0]}.xlsx`)
    setLoadingExport(false)
  }

  // ── IMPORT ──────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportResult(null)
    setImportError(null)

    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)

    try {
      const parsed = parseWorkbook(wb, XLSX)
      setPreview(parsed)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Fichier invalide')
      setPreview(null)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseWorkbook = (wb: any, XLSX: any): PreviewCommande[] => {
    // Essaie de lire la feuille "Commandes" + "Articles" (format export AMLuxe)
    const sheetCommandes = wb.Sheets['Commandes']
    const sheetArticles = wb.Sheets['Articles']
    const sheetFrais = wb.Sheets['Frais']

    if (!sheetCommandes) throw new Error('Feuille "Commandes" introuvable dans le fichier.')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commandes: any[] = XLSX.utils.sheet_to_json(sheetCommandes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articles: any[] = sheetArticles ? XLSX.utils.sheet_to_json(sheetArticles) : []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const frais: any[] = sheetFrais ? XLSX.utils.sheet_to_json(sheetFrais) : []

    return commandes.map((c) => {
      const fournisseur = c['Fournisseur'] ?? c['fournisseur'] ?? ''
      const articlesCommande = articles
        .filter((a) => (a['Fournisseur'] ?? a['fournisseur']) === fournisseur)
        .map((a) => ({
          marque: a['Marque'] ?? a['marque'] ?? '',
          modele: a['Modèle'] ?? a['modele'] ?? '',
          prixAchat: parseFloat(String(a['Prix achat (€)'] ?? a['prixAchat'] ?? 0).replace(',', '.')) || 0,
          etat: a['État'] ?? a['etat'] ?? 'Très bon état',
          refFournisseur: a['Réf. fournisseur'] ?? '',
          statut: a['Statut'] ?? 'En stock',
          prixVente: a['Prix vente affiché (€)'] ? parseFloat(String(a['Prix vente affiché (€)']).replace(',', '.')) : undefined,
          plateforme: a['Plateforme'] || undefined,
          prixVenteReel: a['Prix vente réel (€)'] ? parseFloat(String(a['Prix vente réel (€)']).replace(',', '.')) : undefined,
          fraisVente: a['Frais vente (€)'] ? parseFloat(String(a['Frais vente (€)']).replace(',', '.')) : undefined,
        }))

      const fraisCommande = frais
        .filter((f) => (f['Fournisseur'] ?? f['fournisseur']) === fournisseur)
        .map((f) => ({
          type: f['Type'] ?? f['type'] ?? 'Autre',
          montant: parseFloat(String(f['Montant (€)'] ?? f['montant'] ?? 0).replace(',', '.')) || 0,
          description: f['Description'] ?? '',
        }))

      // Parse date FR (dd/mm/yyyy) ou ISO
      let dateStr = c['Date'] ?? c['date'] ?? ''
      if (typeof dateStr === 'number') {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(dateStr)
        dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
      } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/')
        dateStr = `${year}-${month}-${day}`
      }

      return {
        fournisseur,
        date: dateStr || new Date().toISOString().split('T')[0],
        statut: c['Statut'] ?? c['statut'] ?? 'En préparation',
        tracking: c['Tracking'] ?? c['tracking'] ?? '',
        notes: c['Notes'] ?? c['notes'] ?? '',
        articles: articlesCommande,
        frais: fraisCommande,
      }
    }).filter((c) => c.fournisseur)
  }

  const handleImport = async () => {
    if (!preview || preview.length === 0) return
    setImporting(true)
    setImportError(null)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandes: preview }),
      })
      const result = await res.json()
      setImportResult(result)
      setPreview(null)
      setImportFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setImportError('Erreur lors de l\'import')
    }
    setImporting(false)
  }

  const resetImport = () => {
    setImportFile(null)
    setPreview(null)
    setImportResult(null)
    setImportError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Export / Import</h1>
        <p className="text-sm text-white/40 mt-1">Gérez vos données au format Excel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl">

        {/* ── EXPORT ── */}
        <div className="bg-white/3 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/15 border border-green-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Exporter</h3>
              <p className="text-xs text-white/40">Télécharger toutes les données</p>
            </div>
          </div>

          <ul className="space-y-1.5 mb-5">
            {[
              'Feuille Commandes (ID, fournisseur, date, statut, totaux)',
              'Feuille Articles (prix achat/vente, bénéfice, marge)',
              'Feuille Guide import (colonnes requises)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-white/40">
                <span className="text-green-400 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>

          <button
            onClick={exportGlobal}
            disabled={loadingExport}
            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {loadingExport ? 'Génération...' : 'Télécharger (.xlsx)'}
          </button>
        </div>

        {/* ── IMPORT ── */}
        <div className="bg-white/3 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4 4l4-4m0 0l4 4m-4-4V4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Importer</h3>
              <p className="text-xs text-white/40">Charger un fichier Excel</p>
            </div>
          </div>

          {/* Zone upload */}
          {!importFile && !importResult && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-lg p-6 cursor-pointer transition-colors mb-4 group">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white/20 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs text-white/40 group-hover:text-white/60 transition-colors">Glisser-déposer ou cliquer pour sélectionner</p>
              <p className="text-xs text-white/25">.xlsx uniquement</p>
              <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />
            </label>
          )}

          {/* Erreur */}
          {importError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-400">{importError}</p>
              <button onClick={resetImport} className="text-xs text-red-400/60 hover:text-red-400 mt-1 underline">Réessayer</button>
            </div>
          )}

          {/* Résultat import */}
          {importResult && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-green-400 mb-2">Import réussi ✓</p>
              <ul className="space-y-1 text-xs text-white/60">
                <li>{importResult.nbCommandes} commande{importResult.nbCommandes > 1 ? 's' : ''} créée{importResult.nbCommandes > 1 ? 's' : ''}</li>
                <li>{importResult.nbArticles} article{importResult.nbArticles > 1 ? 's' : ''} créé{importResult.nbArticles > 1 ? 's' : ''}</li>
                <li>{importResult.nbFrais} frais créé{importResult.nbFrais > 1 ? 's' : ''}</li>
              </ul>
              <button onClick={resetImport} className="mt-3 text-xs text-white/40 hover:text-white underline">Importer un autre fichier</button>
            </div>
          )}

          {/* Aperçu avant import */}
          {preview && preview.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-white/60 mb-2">Aperçu — {preview.length} commande{preview.length > 1 ? 's' : ''} détectée{preview.length > 1 ? 's' : ''}</p>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {preview.map((c, i) => (
                  <div key={i} className="bg-white/3 rounded-lg px-3 py-2 text-xs">
                    <p className="font-medium text-white">{c.fournisseur}</p>
                    <p className="text-white/40 mt-0.5">{c.articles.length} article{c.articles.length > 1 ? 's' : ''} · {c.frais.length} frais · {c.statut}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={resetImport} className="flex-1 px-3 py-2 border border-white/10 rounded-lg text-xs text-white/50 hover:bg-white/5 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-medium text-white transition-colors"
                >
                  {importing ? 'Import en cours...' : `Importer ${preview.length} commande${preview.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {!importFile && !importResult && (
            <p className="text-xs text-white/25 text-center">
              Le fichier doit avoir une feuille <strong className="text-white/40">Commandes</strong> avec les colonnes Fournisseur, Date, Statut
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
