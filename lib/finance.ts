/**
 * lib/finance.ts — Source unique de vérité pour les calculs financiers.
 *
 * Modèle Option B :
 *   Les frais de commande (douane, livraison) sont des coûts globaux
 *   non attribuables à un article précis. Ils sont déduits du bénéfice
 *   total, pas répartis par article.
 *
 *   Bénéfice brut  = Σ (prixVenteReel − prixAchat − fraisVente) sur articles vendus
 *   Bénéfice net   = Bénéfice brut − totalFraisCommandes − abonnements mensuels
 */

/** Bénéfice généré par un article vendu (hors frais de commande). */
export function beneficeArticle(
  prixVenteReel: number,
  prixAchat: number,
  fraisVente: number
): number {
  return prixVenteReel - prixAchat - fraisVente
}

/**
 * Bénéfice potentiel d'un article "En vente" si vendu au prix affiché.
 * Les fraisVente ne sont pas connus à l'avance → résultat avant commission.
 */
export function beneficePotentielArticle(prixVente: number, prixAchat: number): number {
  return prixVente - prixAchat
}

/** Durée de vente en jours (de createdAt à dateVente). */
export function dureeVenteJours(createdAt: string | Date, dateVente: string | Date): number {
  const debut = new Date(createdAt).getTime()
  const fin = new Date(dateVente).getTime()
  return Math.max(0, Math.round((fin - debut) / (1000 * 60 * 60 * 24)))
}
