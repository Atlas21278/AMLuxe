# Logique des statistiques — AMLuxe

> Référence à conserver. Ce fichier documente le modèle financier utilisé dans `app/statistiques/page.tsx`.
> Dernière mise à jour : 2026-03-29

---

## Modèle : Cash Flow (position nette)

L'app utilise un **modèle cash flow**, pas un modèle "bénéfice réalisé".

| Modèle | Comportement |
|--------|-------------|
| Bénéfice réalisé (ancien) | Les coûts n'apparaissent que quand un article est vendu |
| **Cash flow (actuel)** | Chaque euro dépensé impacte les stats immédiatement, les revenus arrivent à la vente |

**Exemple concret :**
- Commande : 2 articles × 100 € + 60 € frais = **-260 € immédiatement**
- Vente article 1 à 150 € (- 10 € commission) : position = -260 + 140 = **-120 €**
- Potentiel si article 2 se vend à 180 € : -120 + 180 = **+60 €**

---

## Formule principale

```
Position nette = Revenus nets − Capital investi − Abonnements

Revenus nets     = Σ prixVenteReel − Σ fraisVente          (articles vendus dans la période)
Capital investi  = Σ prixAchat (tous articles de la période) + Frais commandes prorata
Abonnements      = Σ abonnements dont le mois est dans la période
```

---

## Capital investi — règles de calcul

### 1. Date de référence pour les articles
Les articles sont inclus dans le capital investi selon leur **`article.createdAt`** (date d'ajout dans le système), pas la date de vente.

```
articlesPeriode = articles où article.createdAt >= début de la période
capitalAchat    = Σ articlesPeriode.prixAchat
```

### 2. Frais commandes — prorata
Les frais de commande (douane, livraison, autres) sont imputés **au prorata des articles achetés dans la période** par rapport au total de la commande.

```
fraisImputés = totalFraisCommande × (nbArticlesDansPériode / totalArticlesCommande)
```

**Pourquoi le prorata ?**
Une commande peut contenir 10 articles. Si seulement 3 sont dans la période courante, on n'impute que 30 % des frais. Les 70 % restants seront imputés quand les autres articles seront dans leur période respective.

**Date de référence pour les frais :** `commande.createdAt` via l'article (`article.commande.frais`).

```typescript
// Calcul fraisCommandePeriode
const commandesVues = new Map<number, { count: number; frais: number }>()
articlesPeriode.forEach(a => {
  if (!commandesVues.has(a.commandeId)) {
    commandesVues.set(a.commandeId, {
      count: 0,
      frais: a.commande.frais.reduce((s, f) => s + f.montant, 0),
    })
  }
  commandesVues.get(a.commandeId)!.count++
})
fraisCommandePeriode = Σ frais × (count / totalParCommande)
```

---

## Abonnements mensuels — filtrage par période

Les abonnements (`AbonnementMensuel`) ont un champ `mois` de format **YYYY-MM**.

```
Pour la période courante :
  mois inclus = getMoisEntre(debut, now)
  coutAbonnementTotal = Σ abonnements où mois ∈ mois inclus

Pour "Tout" (pas de début) :
  coutAbonnementTotal = Σ tous les abonnements
```

**Pourquoi ?**
Sans ce filtre, filtrer "ce mois" déduirait les abonnements de toute l'année → position nette faussée.

---

## Potentiel

```
Potentiel = Position nette + Σ prixVente (articles "En vente")
```

- Affichage en petit sous la position nette : `"potentiel +60 € si tout vendu"`
- Les fraisVente ne sont pas déduits (inconnus avant la vente) → estimation haute volontaire
- Concerne **tous** les articles En vente, pas seulement ceux de la période

---

## Marge brute

Distincte de la position nette, calculée uniquement sur les articles vendus :

```
Marge brute (%) = Bénéfice brut / CA × 100

Bénéfice brut   = Σ (prixVenteReel − prixAchat − fraisVente) pour articles vendus
```

Ne tient pas compte des frais commandes ni des abonnements. C'est la marge "article par article".

---

## Récupération de l'investissement

Indicateur visuel (barre de progression) sur la carte "Capital investi" :

```
Taux récupération (%) = min(100, Revenus nets / Capital investi × 100)
Revenus nets          = CA − fraisVente
```

Passe au vert quand ≥ 100 %.

---

## Filtrage par période — récapitulatif

| Donnée | Date filtrée | Comportement "Tout" |
|--------|-------------|---------------------|
| Ventes (CA, bénéfice) | `article.dateVente` | Tous les vendus |
| Capital investi (achats) | `article.createdAt` | Tous les articles |
| Frais commandes | Prorata sur articles filtrés | Tous les frais |
| Abonnements | `abonnement.mois` (YYYY-MM) | Tous les abonnements |

---

## Niveaux de calcul (3 niveaux)

```
Niveau article  : prixVenteReel − prixAchat − fraisVente
                  → beneficeArticle() dans lib/finance.ts
                  → Utilisé dans les breakdowns (par marque, fournisseur)

Niveau commande : Σ Ventes − Σ Achats vendus − Σ Frais commande
                  → Page détail commande /commandes/[id]

Niveau global   : Revenus nets − Capital investi − Abonnements
                  → Position nette, page statistiques
```

**Important :** `beneficeArticle()` dans `lib/finance.ts` ne contient PAS les frais commandes — c'est volontaire. Ils sont imputés globalement, pas par article.

---

## Source des données

```
fetch('/api/articles')   → articles avec commande.frais inclus (omit: photos)
fetch('/api/abonnements') → AbonnementMensuel[]
```

L'API `GET /api/articles` sans paramètres retourne tous les articles non supprimés avec `include: { commande: { include: { frais: true } } }`.

---

## Breakdowns calculés

| Breakdown | Groupé par | Métriques |
|-----------|-----------|-----------|
| `parMois` | `dateVente` YYYY-MM | CA, bénéfice brut (vendusAll, toutes périodes) |
| `parMarque` | `article.marque` | CA, bénéfice brut, nb ventes |
| `parPlateforme` | `article.plateforme` | CA, nb ventes |
| `parFournisseur` | `commande.fournisseur` | CA, bénéfice brut, nb ventes |

`parMois` est toujours calculé sur **vendusAll** (toute la période) pour avoir la courbe complète, indépendamment du filtre de période sélectionné.

---

## Ce qui reste à faire / points ouverts

- [ ] Afficher la **position nette mensuelle** dans le graphique (pas seulement bénéfice brut) — nécessite de connaître les achats par mois
- [ ] Estimer les fraisVente potentiels en utilisant un **taux moyen historique** pour le bénéfice potentiel
- [ ] Si Railway scale vers plusieurs pods → les données sont recalculées côté client, pas de problème. Mais si on migre les calculs côté serveur, attention à la cohérence des dates
