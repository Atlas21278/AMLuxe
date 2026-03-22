'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'

interface PreviewCommande {
  fournisseur: string
  date: string
  statut: string
  tracking?: string
  notes?: string
  articles: {
    marque: string; modele: string; prixAchat: number; etat: string
    refFournisseur?: string; statut?: string; prixVente?: number
    plateforme?: string; prixVenteReel?: number; fraisVente?: number
  }[]
  frais: { type: string; montant: number; description?: string }[]
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function ImportModal({ onClose, onSuccess }: Props) {
  const [preview, setPreview] = useState<PreviewCommande[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ nbCommandes: number; nbArticles: number; nbFrais: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportResult(null)

    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)

    try {
      const parsed = parseWorkbook(wb, XLSX)
      if (parsed.length === 0) throw new Error('Aucune commande valide trouvée dans le fichier.')
      setPreview(parsed)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Fichier invalide')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseWorkbook = (wb: any, XLSX: any): PreviewCommande[] => {
    const sheetCommandes = wb.Sheets['Commandes']
    if (!sheetCommandes) throw new Error('Feuille "Commandes" introuvable. Utilisez le fichier exporté depuis AMLuxe.')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commandes: any[] = XLSX.utils.sheet_to_json(sheetCommandes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articles: any[] = wb.Sheets['Articles'] ? XLSX.utils.sheet_to_json(wb.Sheets['Articles']) : []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const frais: any[] = wb.Sheets['Frais'] ? XLSX.utils.sheet_to_json(wb.Sheets['Frais']) : []

    return commandes
      .map((c) => {
        const fournisseur = String(c['Fournisseur'] ?? c['fournisseur'] ?? '').trim()
        if (!fournisseur) return null

        // Parse date
        let dateStr = c['Date'] ?? c['date'] ?? ''
        if (typeof dateStr === 'number') {
          const d = XLSX.SSF.parse_date_code(dateStr)
          dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
        } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/')
          dateStr = `${year}-${month}-${day}`
        }

        const articlesCommande = articles
          .filter((a) => String(a['Fournisseur'] ?? a['fournisseur'] ?? '').trim() === fournisseur)
          .map((a) => ({
            marque: String(a['Marque'] ?? a['marque'] ?? '').trim(),
            modele: String(a['Modèle'] ?? a['modele'] ?? '').trim(),
            prixAchat: parseFloat(String(a['Prix achat (€)'] ?? a['prixAchat'] ?? 0).replace(',', '.')) || 0,
            etat: String(a['État'] ?? a['etat'] ?? 'Très bon état'),
            refFournisseur: a['Réf. fournisseur'] ? String(a['Réf. fournisseur']) : undefined,
            statut: String(a['Statut'] ?? 'En stock'),
            prixVente: a['Prix vente affiché (€)'] ? parseFloat(String(a['Prix vente affiché (€)']).replace(',', '.')) : undefined,
            plateforme: a['Plateforme'] ? String(a['Plateforme']) : undefined,
            prixVenteReel: a['Prix vente réel (€)'] ? parseFloat(String(a['Prix vente réel (€)']).replace(',', '.')) : undefined,
            fraisVente: a['Frais vente (€)'] ? parseFloat(String(a['Frais vente (€)']).replace(',', '.')) : undefined,
          }))
          .filter((a) => a.marque && a.modele)

        const fraisCommande = frais
          .filter((f) => String(f['Fournisseur'] ?? f['fournisseur'] ?? '').trim() === fournisseur)
          .map((f) => ({
            type: String(f['Type'] ?? f['type'] ?? 'Autre'),
            montant: parseFloat(String(f['Montant (€)'] ?? f['montant'] ?? 0).replace(',', '.')) || 0,
            description: f['Description'] ? String(f['Description']) : undefined,
          }))
          .filter((f) => f.montant > 0)

        return {
          fournisseur,
          date: dateStr || new Date().toISOString().split('T')[0],
          statut: String(c['Statut'] ?? c['statut'] ?? 'En préparation'),
          tracking: c['Tracking'] ? String(c['Tracking']) : undefined,
          notes: c['Notes'] ? String(c['Notes']) : undefined,
          articles: articlesCommande,
          frais: fraisCommande,
        }
      })
      .filter(Boolean) as PreviewCommande[]
  }

  const handleImport = async () => {
    if (!preview) return
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
      onSuccess()
    } catch {
      setImportError("Erreur lors de l'import")
    }
    setImporting(false)
  }

  const reset = () => {
    setPreview(null)
    setImportError(null)
    setImportResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Modal title="Importer des commandes" onClose={onClose}>
      {/* Résultat */}
      {importResult && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-green-400 mb-2">Import réussi ✓</p>
          <ul className="space-y-1 text-xs text-white/60">
            <li>{importResult.nbCommandes} commande{importResult.nbCommandes > 1 ? 's' : ''} créée{importResult.nbCommandes > 1 ? 's' : ''}</li>
            <li>{importResult.nbArticles} article{importResult.nbArticles > 1 ? 's' : ''} créé{importResult.nbArticles > 1 ? 's' : ''}</li>
            <li>{importResult.nbFrais} frais créé{importResult.nbFrais > 1 ? 's' : ''}</li>
          </ul>
          <button onClick={onClose} className="mt-3 w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors">
            Fermer
          </button>
        </div>
      )}

      {/* Erreur */}
      {importError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-400">{importError}</p>
          <button onClick={reset} className="text-xs text-red-400/60 hover:text-red-400 mt-1 underline">Réessayer</button>
        </div>
      )}

      {/* Upload */}
      {!preview && !importResult && (
        <>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-lg p-8 cursor-pointer transition-colors mb-4 group">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white/20 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">Cliquer pour sélectionner un fichier</p>
            <p className="text-xs text-white/25">.xlsx — format export AMLuxe</p>
            <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />
          </label>
          <p className="text-xs text-white/25 text-center">
            Le fichier doit contenir une feuille <strong className="text-white/40">Commandes</strong> avec les colonnes Fournisseur, Date, Statut
          </p>
        </>
      )}

      {/* Aperçu */}
      {preview && (
        <>
          <div className="mb-4">
            <p className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
              {preview.length} commande{preview.length > 1 ? 's' : ''} détectée{preview.length > 1 ? 's' : ''}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {preview.map((c, i) => (
                <div key={i} className="bg-white/3 border border-white/5 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{c.fournisseur}</p>
                    <p className="text-xs text-white/30">{c.date}</p>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {c.articles.length} article{c.articles.length > 1 ? 's' : ''}
                    {c.frais.length > 0 && ` · ${c.frais.length} frais`}
                    {' · '}
                    <span className="text-white/50">{c.statut}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-white/60 hover:bg-white/5 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
            >
              {importing ? 'Import en cours...' : `Importer ${preview.length} commande${preview.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
