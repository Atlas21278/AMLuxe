/**
 * lib/finance.ts
 * Source unique de vérité pour tous les calculs financiers.
 *
 * Règle : les frais de commande (douane, livraison, etc.) sont répartis
 * au prorata du nombre total d'articles dans la commande.
 *
 * Bénéfice article = Prix vente − Prix achat − Frais vente − (Frais commande / Nb articles)
 */

export interface ArticlePourFinance {
  prixVenteReel: number | null
  prixAchat: number
  fraisVente: number | null
  commandeId: number
  statut: string
}

export interface CommandePourFinance {
  id: number
  fraisTotaux: number   // somme de tous les Frais de la commande
  nbArticles: number    // nombre total d'articles (vendus ou non)
}

/**
 * Calcule la quote-part des frais de commande attribuée à un article.
 */
export function fraisParArticle(fraisTotaux: number, nbArticles: number): number {
  return nbArticles > 0 ? fraisTotaux / nbArticles : 0
}

/**
 * Calcule le bénéfice net d'un article vendu.
 * Inclut la quote-part des frais de commande.
 */
export function calculerBeneficeArticle(
  prixVenteReel: number,
  prixAchat: number,
  fraisVente: number,
  fraisCommandeParArticle: number
): number {
  return prixVenteReel - prixAchat - fraisVente - fraisCommandeParArticle
}

/**
 * Construit une Map commandeId → fraisParArticle à partir d'une liste d'articles.
 * Groupe les articles par commandeId pour compter le total et sommer les frais.
 *
 * Utilisation : quand on n'a pas accès directement aux commandes mais qu'on a
 * les articles avec leur commande incluse (ex : /api/articles retourne Article & { commande & { frais } }).
 */
export function construireMapFraisParArticle(
  articles: Array<ArticlePourFinance & { commande: { id: number; frais: { montant: number }[] } }>
): Map<number, number> {
  // Déduplique : ne traite chaque commande qu'une fois
  const commandesVues = new Map<number, { fraisTotaux: number; nbArticles: number }>()

  for (const article of articles) {
    const cmdId = article.commandeId
    if (!commandesVues.has(cmdId)) {
      const fraisTotaux = article.commande.frais.reduce((s, f) => s + f.montant, 0)
      commandesVues.set(cmdId, { fraisTotaux, nbArticles: 0 })
    }
    commandesVues.get(cmdId)!.nbArticles += 1
  }

  const map = new Map<number, number>()
  for (const [cmdId, { fraisTotaux, nbArticles }] of commandesVues) {
    map.set(cmdId, fraisParArticle(fraisTotaux, nbArticles))
  }
  return map
}
