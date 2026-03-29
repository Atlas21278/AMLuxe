'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { TYPES_FRAIS } from '@/constants/statuts'

interface Props {
  commandeId: number
  onClose: () => void
}

export default function FormulaireFrais({ commandeId, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    type: 'Douane',
    montant: '',
    description: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/frais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, commandeId }),
      })
      if (!res.ok) {
        toast.error('Erreur lors de l\'ajout des frais')
        return
      }
      toast.success('Frais ajoutés')
      onClose()
    })
  }

  const inputClass = "w-full bg-[#0f0f18] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Type *</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
            {TYPES_FRAIS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Montant (€) *</label>
          <input type="number" step="0.01" min="0" required placeholder="0.00" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Description</label>
        <input type="text" placeholder="Ex : Douane DHL, frais Chronopost..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">Annuler</button>
        <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium text-white transition-colors">
          {isPending ? 'Enregistrement...' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}
