interface BadgeProps {
  statut: string
  href?: string
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
  'En retour': {
    label: 'En retour',
    className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  },
  'Endommagé': {
    label: 'Endommagé',
    className: 'bg-red-500/15 text-red-400 border border-red-500/30',
  },
  'Litige': {
    label: 'Litige',
    className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  },
}

export default function Badge({ statut, href }: BadgeProps) {
  const config = statutConfig[statut] ?? {
    label: statut,
    className: 'bg-white/10 text-white/60 border border-white/20',
  }

  const baseClass = `inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`

  if (href && statut === 'En vente') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${baseClass} hover:brightness-125 transition-[filter] cursor-pointer`}
        title="Voir l'annonce"
        data-testid="badge-lien-annonce"
      >
        {config.label}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    )
  }

  return (
    <span className={baseClass}>
      {config.label}
    </span>
  )
}
