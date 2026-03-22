import { Prisma } from '@prisma/client'

type ArticleAvecCommande = Prisma.ArticleGetPayload<{
  include: { commande: { include: { frais: true } } }
}>

export interface ResultatBenefice {
  caTotal: number
  coutAchatTotal: number
  fraisVenteTotal: number
  fraisCommandeTotal: number
  abonnementsTotal: number
  beneficeNet: number
}

/**
 * Calcule le bénéfice net à partir des articles vendus et des abonnements.
 * Source unique de vérité — utilisée dans statistiques, objectifs, etc.
 */
export function calculerBenefice(
  articles: ArticleAvecCommande[],
  abonnementsTotal: number
): ResultatBenefice {
  const vendus = articles.filter((a) => a.statut === 'Vendu')

  const caTotal = vendus.reduce((sum, a) => sum + (a.prixVenteReel ?? 0), 0)
  const coutAchatTotal = vendus.reduce((sum, a) => sum + a.prixAchat, 0)
  const fraisVenteTotal = vendus.reduce((sum, a) => sum + (a.fraisVente ?? 0), 0)

  // Frais de commande : dédupliqués par commandeId pour ne pas les compter plusieurs fois
  const commandeIdsSeen = new Set<number>()
  let fraisCommandeTotal = 0
  for (const a of vendus) {
    if (!commandeIdsSeen.has(a.commandeId)) {
      commandeIdsSeen.add(a.commandeId)
      const fraisCommande = a.commande?.frais ?? []
      fraisCommandeTotal += fraisCommande.reduce((s, f) => s + f.montant, 0)
    }
  }

  const beneficeNet = caTotal - coutAchatTotal - fraisVenteTotal - fraisCommandeTotal - abonnementsTotal

  return { caTotal, coutAchatTotal, fraisVenteTotal, fraisCommandeTotal, abonnementsTotal, beneficeNet }
}

/**
 * Formate un montant en euros (fr-FR).
 */
export function formatEur(n: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: decimals,
  }).format(n)
}

/**
 * Formate une date en français.
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
