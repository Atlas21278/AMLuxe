'use client'

import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import FormulaireCommande from '@/components/commandes/FormulaireCommande'
import ListeCommandes from '@/components/commandes/ListeCommandes'
import ImportModal from '@/components/ImportModal'
import type { Commande, Article, Frais } from '@prisma/client'

type CommandeAvecRelations = Commande & {
  articles: Article[]
  frais: Frais[]
}

export default function CommandesPage() {
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [commandes, setCommandes] = useState<CommandeAvecRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchCommandes = useCallback(async () => {
    const res = await fetch('/api/commandes')
    const data = await res.json()
    setCommandes(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCommandes()
  }, [fetchCommandes])

  const handleClose = () => {
    setShowModal(false)
    fetchCommandes()
  }

  const exportExcel = async () => {
    setExporting(true)
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // Feuille Commandes
    const commandesData = commandes.map((c) => ({
      ID: c.id,
      Fournisseur: c.fournisseur,
      Date: new Date(c.date).toLocaleDateString('fr-FR'),
      Statut: c.statut,
      Tracking: c.tracking ?? '',
      'Nb articles': c.articles.length,
      'Total achat (€)': c.articles.reduce((acc, a) => acc + a.prixAchat, 0).toFixed(2),
      'Total frais (€)': c.frais.reduce((acc, f) => acc + f.montant, 0).toFixed(2),
      'Coût total (€)': (
        c.articles.reduce((acc, a) => acc + a.prixAchat, 0) +
        c.frais.reduce((acc, f) => acc + f.montant, 0)
      ).toFixed(2),
      Notes: c.notes ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commandesData), 'Commandes')

    // Feuille Articles (tous les articles de toutes les commandes)
    const articlesData = commandes.flatMap((c) =>
      c.articles.map((a) => {
        const benefice = a.prixVenteReel
          ? a.prixVenteReel - (a.fraisVente ?? 0) - a.prixAchat
          : null
        return {
          'Commande ID': c.id,
          Fournisseur: c.fournisseur,
          Marque: a.marque,
          Modèle: a.modele,
          État: a.etat,
          'N° de série': a.refFournisseur ?? '',
          Statut: a.statut,
          'Prix achat (€)': a.prixAchat.toFixed(2),
          'Prix vente affiché (€)': a.prixVente?.toFixed(2) ?? '',
          Plateforme: a.plateforme ?? '',
          'Prix vente réel (€)': a.prixVenteReel?.toFixed(2) ?? '',
          'Frais vente (€)': a.fraisVente?.toFixed(2) ?? '',
          'Bénéfice (€)': benefice?.toFixed(2) ?? '',
          'Marge (%)': a.prixVenteReel && benefice !== null
            ? ((benefice / a.prixVenteReel) * 100).toFixed(1)
            : '',
          'Date vente': a.dateVente ? new Date(a.dateVente).toLocaleDateString('fr-FR') : '',
        }
      })
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(articlesData), 'Articles')

    // Feuille Frais
    const fraisData = commandes.flatMap((c) =>
      c.frais.map((f) => ({
        'Commande ID': c.id,
        Fournisseur: c.fournisseur,
        Type: f.type,
        'Montant (€)': f.montant.toFixed(2),
        Description: f.description ?? '',
        Date: new Date(f.createdAt).toLocaleDateString('fr-FR'),
      }))
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fraisData), 'Frais')

    const date = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `AMLuxe_commandes_${date}.xlsx`)
    setExporting(false)
  }

  const stats = {
    total: commandes.length,
    enPreparation: commandes.filter((c) => c.statut === 'En préparation').length,
    enLivraison: commandes.filter((c) => c.statut === 'En livraison').length,
    recues: commandes.filter((c) => c.statut === 'Reçue').length,
  }

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Commandes fournisseurs</h1>
          <p className="text-sm text-white/40 mt-1">{stats.total} commande{stats.total > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Importer Excel</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nouvelle commande</span>
            <span className="sm:hidden">Nouvelle</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'border-white/10' },
          { label: 'En préparation', value: stats.enPreparation, color: 'border-yellow-500/30' },
          { label: 'En livraison', value: stats.enLivraison, color: 'border-blue-500/30' },
          { label: 'Reçues', value: stats.recues, color: 'border-green-500/30' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white/3 border ${stat.color} rounded-xl p-4`}>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 w-24 ml-4" />
                <div className="skeleton h-5 w-20 rounded-full ml-4" />
                <div className="skeleton h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : (
          <ListeCommandes commandes={commandes} onRefresh={fetchCommandes} />
        )}
      </div>

      {/* Modal nouvelle commande */}
      {showModal && (
        <Modal title="Nouvelle commande" onClose={() => setShowModal(false)} size="lg">
          <FormulaireCommande onClose={handleClose} />
        </Modal>
      )}

      {/* Modal import */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { fetchCommandes(); setShowImport(false) }}
        />
      )}
    </div>
  )
}
