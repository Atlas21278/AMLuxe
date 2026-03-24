// Statuts des commandes
export const STATUTS_COMMANDE = ['En préparation', 'En livraison', 'Reçue'] as const
export type StatutCommande = typeof STATUTS_COMMANDE[number]

// Statuts des articles
export const STATUTS_ARTICLE = ['En stock', 'En vente', 'Vendu', 'En retour', 'Endommagé', 'Litige'] as const
export type StatutArticle = typeof STATUTS_ARTICLE[number]

// États des articles
export const ETATS = ['Neuf', 'Très bon état', 'Bon état', 'Satisfaisant'] as const
export type EtatArticle = typeof ETATS[number]

// Types de frais
export const TYPES_FRAIS = ['Douane', 'Livraison', 'Assurance', 'Autre'] as const
export type TypeFrais = typeof TYPES_FRAIS[number]

// Plateformes de vente
export const PLATEFORMES = ['Vinted', 'Leboncoin', 'Instagram', 'Vestiaire Collective', 'Autre'] as const
export type Plateforme = typeof PLATEFORMES[number]

// Rôles utilisateurs
export const ROLES_USER = ['admin', 'viewer'] as const
export type RoleUser = typeof ROLES_USER[number]

// Devises supportées
export const DEVISES = ['EUR', 'USD', 'GBP', 'CHF'] as const
export type Devise = typeof DEVISES[number]

export const DEVISE_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
}
