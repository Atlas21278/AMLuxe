interface BadgeProps {
  statut: string
}

const statutConfig: Record<string, { label: string; className: string }> = {
  // Commandes
  'En préparation': {
    label: 'En préparation',
    className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  },
  'En livraison': {
    label: 'En livraison',
    className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  },
  'Reçue': {
    label: 'Reçue',
    className: 'bg-green-500/15 text-green-400 border border-green-500/30',
  },
  // Articles
  'En stock': {
    label: 'En stock',
    className: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  },
  'En vente': {
    label: 'En vente',
    className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  },
  'Vendu': {
    label: 'Vendu',
    className: 'bg-green-500/15 text-green-400 border border-green-500/30',
  },
}

export default function Badge({ statut }: BadgeProps) {
  const config = statutConfig[statut] ?? {
    label: statut,
    className: 'bg-white/10 text-white/60 border border-white/20',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
