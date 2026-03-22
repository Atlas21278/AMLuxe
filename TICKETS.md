# AMLuxe — Backlog des tickets

> Chaque ticket a un numéro unique, une priorité et une catégorie.
> **Priorités** : 🔴 Critique · 🟠 Important · 🟡 Amélioration · 🟢 Nice-to-have

---

## 🔴 SÉCURITÉ — Critique

### ✅ T-001 · Routes API GET non protégées
**Fichiers** : `app/api/commandes/route.ts`, `app/api/articles/route.ts`, `app/api/frais/route.ts`
Les routes GET ne vérifient pas la session — n'importe qui peut accéder aux données sans être connecté.
**Fix** : Ajouter `getServerSession(authOptions)` sur chaque GET manquant.

---

### ✅ T-002 · Route /api/import non protégée
**Fichier** : `app/api/import/route.ts`
Aucune vérification de session. Un attaquant peut importer des données en masse sans authentification.
**Fix** : Ajouter `getServerSession()` avant tout traitement.

---

### ✅ T-003 · Route DELETE /api/commandes/[id] non protégée
**Fichier** : `app/api/commandes/[id]/route.ts`
La suppression en cascade (commande + articles + frais) est accessible sans auth.
**Fix** : Ajouter `getServerSession()` sur le DELETE.

---

### ✅ T-004 · Pas de rate limiting sur le login
**Fichier** : `app/api/auth/[...nextauth]/route.ts`
Les tentatives de connexion ne sont pas limitées — brute-force possible.
**Fix** : Ajouter un middleware de rate limiting (ex: `upstash/ratelimit` ou middleware custom).

---

### ✅ T-005 · Logs Prisma actifs en production
**Fichier** : `lib/prisma.ts`
`log: ['query']` expose les requêtes SQL dans les logs de production.
**Fix** : `log: process.env.NODE_ENV !== 'production' ? ['query'] : []`

---

## 🟠 BUGS — Important

### ✅ T-006 · Images des CarCards invisibles (cache race condition)
**Fichier** : `app/objectifs/page.tsx`
Quand les images sont déjà en cache, `onLoad` ne se déclenche pas et `imgOk` reste `false` → images `opacity-0`.
**Fix** : Vérifier `img.complete && img.naturalWidth > 0` dans un `useEffect` après le montage. *(Fix appliqué — à valider en prod)*

---

### ✅ T-007 · Validation absente sur les inputs des routes API
**Fichiers** : toutes les routes `POST`/`PUT`
Aucune validation : prix négatifs acceptés, dates malformées, chaînes vides stockées.
**Fix** : Intégrer Zod pour valider les payloads avant toute écriture en DB.

---

### ✅ T-008 · Import Excel sans validation des données
**Fichier** : `app/export/page.tsx` (fonction `parseWorkbook`)
Colonnes manquantes, prix négatifs ou dates invalides sont importés sans contrôle.
**Fix** : Valider chaque ligne avant l'import et afficher les lignes en erreur à l'utilisateur.

---

### ✅ T-009 · Suppression multiple de commandes sans transaction
**Fichier** : `components/commandes/ListeCommandes.tsx`
`Promise.all([...suppression])` en parallèle sans transaction Prisma — si une échoue, les données sont incohérentes.
**Fix** : Créer une route `DELETE /api/commandes/bulk` avec `prisma.$transaction`.

---

### ✅ T-010 · Pas de feedback d'erreur réseau
**Partout** dans les pages (commandes, articles, stats…)
Si un fetch échoue, la page reste vide sans aucun message. L'utilisateur ne sait pas s'il y a un problème.
**Fix** : Afficher un toast d'erreur explicite avec un bouton "Réessayer".

---

### ✅ T-011 · Calcul du bénéfice dupliqué et non centralisé
**Fichiers** : `app/statistiques/page.tsx`, `app/objectifs/page.tsx`, `app/commandes/[id]/page.tsx`
Le même calcul `CA - achats - fraisVente - fraisCommande - abonnements` est réécrit 3 fois.
**Fix** : Créer une fonction utilitaire `calculerBenefice()` dans `lib/calculs.ts`.

---

### ✅ T-012 · Statuts des commandes/articles hardcodés partout
**Fichiers** : multiples composants et pages
Les strings `"En préparation"`, `"En livraison"`, `"En stock"`, `"Vendu"` sont éparpillées dans tout le code.
**Fix** : Créer `constants/statuts.ts` avec des enums et les importer partout.

---

### ✅ T-013 · Rôles utilisateurs définis en DB mais jamais vérifiés
**Fichier** : `app/api/users/route.ts`, middleware
Le champ `role` existe dans le schéma Prisma mais aucune route API ne l'utilise pour restreindre l'accès.
**Fix** : Implémenter un RBAC minimal (admin vs viewer) sur les routes sensibles.

---

### ✅ T-014 · Session NextAuth sans expiration définie
**Fichier** : `lib/auth.ts`
Les sessions JWT n'ont pas de `maxAge` défini explicitement.
**Fix** : Ajouter `session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }` (8h par exemple).

---

## 🟡 FONCTIONNALITÉS — Améliorations

### T-015 · Ajouter la pagination backend sur les articles et commandes
**Fichiers** : `app/api/articles/route.ts`, `app/api/commandes/route.ts`
Tout est chargé d'un coup — si la base grossit (500+ articles), les pages lagueront.
**Fix** : Implémenter `skip` / `take` en API + pagination UI côté client.

---

### ✅ T-016 · Filtres avancés sur la liste des articles
**Fichier** : `app/articles/page.tsx`
Actuellement : filtre par statut uniquement.
**Manque** : filtre par marque, fourchette de prix, date d'achat, plateforme de vente.

---

### ✅ T-017 · Filtres avancés sur la liste des commandes
**Fichier** : `app/commandes/page.tsx`
Actuellement : recherche texte basique.
**Manque** : filtre par statut, par date range, par fournisseur.

---

### ✅ T-018 · Ajouter des statuts intermédiaires pour les articles
**Fichier** : `prisma/schema.prisma`
Statuts actuels : `En stock`, `En vente`, `Vendu`. Manquent : `En retour`, `Endommagé`, `Litige`.
**Fix** : Ajouter au schema + mettre à jour l'UI avec les couleurs correspondantes.

---

### T-019 · Export PDF des commandes / factures
**Fichier** : `app/export/page.tsx`
L'export Excel existe mais pas le PDF.
**Fix** : Intégrer `@react-pdf/renderer` ou `jsPDF` pour générer une fiche par commande.

---

### T-020 · Page de réinitialisation de mot de passe
**Fichier** : `app/login/page.tsx`
Aucun flow "mot de passe oublié". Les admins doivent le changer manuellement via Prisma Studio.
**Fix** : Créer `app/forgot-password/page.tsx` + route API avec token temporaire par email.

---

### ✅ T-021 · Ajouter des indexes Prisma sur les colonnes filtrées
**Fichier** : `prisma/schema.prisma`
Les colonnes `marque`, `statut`, `fournisseur` sont souvent filtrées mais n'ont pas d'index.
**Fix** : Ajouter `@@index([marque])`, `@@index([statut])`, etc.

---

### ✅ T-022 · Ajouter la memoization dans la page statistiques
**Fichier** : `app/statistiques/page.tsx`
Tous les calculs (par marque, par plateforme, bénéfice…) sont recalculés à chaque render.
**Fix** : Wrapper avec `useMemo` pour n'être recalculés que si les données changent.

---

### T-023 · Ajouter un composant `<Table>` générique réutilisable
**Fichiers** : `app/commandes/page.tsx`, `app/articles/page.tsx`
Chaque tableau réimplémente sa logique de tri, hover, sélection.
**Fix** : Créer `components/ui/Table.tsx` avec colonnes configurables.

---

### ✅ T-024 · Breadcrumb de navigation
**Fichier** : `components/ClientLayout.tsx`
Dans `/commandes/[id]` on ne sait pas facilement revenir en arrière.
**Fix** : Ajouter un breadcrumb `Commandes > Commande #42` en haut des pages détail.

---

### T-025 · Soft delete pour les commandes et articles
**Fichier** : `prisma/schema.prisma`
La suppression est irréversible et immédiate.
**Fix** : Ajouter un champ `deletedAt: DateTime?` + filtrer les requêtes pour exclure les enregistrements supprimés + bouton "Restaurer" dans l'UI.

---

### T-026 · Historique des modifications d'un article
**Fichier** : `prisma/schema.prisma`
Quand on modifie un prix de vente ou un statut, l'ancienne valeur est perdue.
**Fix** : Créer une table `ArticleHistorique` + middleware Prisma pour logger les changements.

---

### ✅ T-027 · Confirmation avant suppression d'une commande
**Fichier** : `components/commandes/ListeCommandes.tsx`
La suppression se déclenche directement, sans modale de confirmation.
**Fix** : Afficher une modale de confirmation avec le nombre d'articles qui seront supprimés.

---

### ✅ T-028 · Undo après suppression
**Partout** où il y a une suppression
Après avoir supprimé, l'utilisateur ne peut pas annuler.
**Fix** : Afficher un toast "Supprimé · Annuler" pendant 5 secondes avant la suppression réelle.

---

### ✅ T-029 · Gestion des notes sur les frais de commande
**Fichier** : `components/commandes/FormulaireFrais.tsx`
Le champ `description` existe dans le schema Prisma mais n'est pas visible dans l'UI.
**Fix** : Afficher le champ dans le formulaire d'ajout de frais.

---

### ✅ T-030 · Améliorer les loading states dans la page statistiques
**Fichier** : `app/statistiques/page.tsx`
Des skeletons existent dans les pages commandes/articles mais pas dans les stats.
**Fix** : Ajouter des squelettes pour chaque KPI card et chaque graphique.

---

### ✅ T-031 · Indicateur de rentabilité par article dans le détail commande
**Fichier** : `app/commandes/[id]/page.tsx`
Le tableau des articles ne montre pas la marge unitaire (prix vente − prix achat − frais).
**Fix** : Ajouter une colonne "Marge" avec une couleur verte/rouge selon la rentabilité.

---

### ✅ T-032 · Graphique d'évolution du bénéfice dans les statistiques
**Fichier** : `app/statistiques/page.tsx`
Il n'y a pas de graphique chronologique montrant l'évolution du bénéfice mois par mois.
**Fix** : Ajouter un `LineChart` Recharts avec les données groupées par mois.

---

### ✅ T-033 · Ajouter un dashboard avec les KPIs du mois en cours sur la page d'accueil
**Fichier** : `app/page.tsx` (ou créer un redirect vers `/commandes`)
La page d'accueil redirige vers `/commandes`. Pas de vue synthétique.
**Fix** : Créer un vrai dashboard avec les stats du mois, les dernières commandes et les articles en attente.

---

### ✅ T-034 · Numéro de tracking cliquable dans les commandes
**Fichier** : `app/commandes/[id]/page.tsx`
Le champ `tracking` est affiché comme du texte brut.
**Fix** : Détecter le transporteur (Chronopost, Colissimo, DHL…) depuis le format du numéro et générer un lien de suivi.

---

### ✅ T-035 · Statistiques par fournisseur
**Fichier** : `app/statistiques/page.tsx`
Il y a des stats par marque et par plateforme, mais pas par fournisseur.
**Fix** : Ajouter une section "Top fournisseurs" avec CA, bénéfice et nombre d'articles par fournisseur.

---

## 🟢 NICE-TO-HAVE — Backlog long terme

### T-036 · Notifications en temps réel
Alertes quand une commande passe au statut "Reçue", quand un article se vend, etc. via WebSocket ou Server-Sent Events.

---

### T-037 · Intégration Vinted / Leboncoin
Synchronisation automatique des annonces et des ventes depuis les plateformes. *(Mentionné dans la vision évolutive du CLAUDE.md)*

---

### T-038 · Tracking colis automatique
Détecter le transporteur depuis le numéro de tracking et afficher le statut de livraison en temps réel.

---

### T-039 · Multi-devise
Support EUR, USD, GBP avec conversion automatique.

---

### T-040 · Mode "Remember Me" sur le login
Option pour rester connecté 30 jours au lieu de la durée de session standard.

---

### T-041 · Tests unitaires et E2E
Zéro test actuellement. Ajouter Jest + Testing Library pour les calculs métier, Playwright pour les workflows critiques (créer commande → ajouter article → vendre).

---

### T-042 · Fichier `.env.example`
Créer un `.env.example` avec toutes les variables requises documentées pour faciliter l'onboarding.

---

### T-043 · Composant `<Icon>` réutilisable
Tous les SVGs sont inline dans chaque composant. Créer un composant centralisé `<Icon name="trash" size={20} />`.

---

### T-044 · Audit log — qui a fait quoi et quand
Table `Audit` pour tracer toutes les créations/modifications/suppressions avec l'utilisateur responsable.

---

### T-045 · Support mobile amélioré
Certains tableaux ne sont pas lisibles sur mobile. Revoir le layout des pages commandes et articles pour les petits écrans.

---

---

## 🟠 UX & COHÉRENCE — Incohérences formulaires

### ✅ T-046 · Combobox marque/modèle absent dans l'édition d'article
**Fichier** : `components/articles/FormulaireArticle.tsx`
Le formulaire de création de commande utilise un `<Combobox>` avec autocomplétion pour marque et modèle. Mais le formulaire d'édition d'article (`FormulaireArticle`) utilise de simples `<input type="text">`.
**Fix** : Remplacer les inputs marque/modèle par le composant `<Combobox>` avec `MARQUES` et `getModeles()` depuis `data/marques.ts`, comme dans `FormulaireCommande`.

---

### ✅ T-047 · Pas de bouton "Modifier" article depuis la page /articles
**Fichier** : `app/articles/page.tsx`
Sur la page articles, seul le bouton "Vendre" est disponible sur chaque ligne. Pour modifier la marque, le modèle ou l'état d'un article, l'utilisateur doit naviguer vers `/commandes/[id]` — ce n'est pas intuitif.
**Fix** : Ajouter un bouton "Modifier" (icône crayon) sur chaque ligne de la page articles qui ouvre `FormulaireArticle` en mode édition.

---

### ✅ T-048 · Gestion d'erreur API absente dans tous les formulaires
**Fichiers** : `FormulaireArticle.tsx`, `FormulaireVente.tsx`, `FormulaireFrais.tsx`, `FormulaireCommande.tsx`
Aucun formulaire ne vérifie si le `fetch` a réussi avant d'appeler `onClose()`. Si l'API renvoie une erreur 4xx/5xx, le modal se ferme sans afficher de message — l'utilisateur pense que ça a marché.
**Fix** : Ajouter `if (!res.ok) { toast.error(...); return }` dans chaque `handleSubmit` avant d'appeler `onClose()`.

---

### ✅ T-049 · Deux systèmes de toast cohabitent
**Fichiers** : `components/ui/Toast.tsx` (custom), `sonner` (library)
Le composant `Toast.tsx` est encore utilisé dans `app/commandes/[id]/page.tsx` alors que Sonner est utilisé partout ailleurs. Deux systèmes = deux positionnements, deux styles, incohérence visuelle.
**Fix** : Remplacer toutes les utilisations du composant `<Toast>` custom par `toast.error()` / `toast.success()` de Sonner, puis supprimer `components/ui/Toast.tsx`.

---

### ✅ T-050 · Constantes locales dupliquées malgré `constants/statuts.ts`
**Fichiers** : `FormulaireCommande.tsx`, `FormulaireFrais.tsx`, `ListeCommandes.tsx`, `FormulaireArticle.tsx`
Malgré la création de `constants/statuts.ts`, chaque composant redéfinit ses propres tableaux de statuts, états et types de frais localement. En plus, `FormulaireFrais.tsx` n'a pas 'Assurance' dans ses types de frais alors que `constants/statuts.ts` l'inclut.
**Fix** : Importer et utiliser `STATUTS_COMMANDE`, `STATUTS_ARTICLE`, `TYPES_FRAIS`, `ETATS` depuis `constants/statuts.ts` dans tous les composants. Supprimer les déclarations locales.

---

### ✅ T-051 · Fournisseur = champ texte libre sans autocomplétion
**Fichier** : `components/commandes/FormulaireCommande.tsx`
Le champ "Fournisseur" est un `<input type="text">` libre. Cela provoque des doublons dans les données ("Alibaba", "alibaba", "ALIBABA") qui cassent les statistiques par fournisseur.
**Fix** : Remplacer par un `<Combobox>` qui propose les fournisseurs déjà utilisés (chargés via `/api/commandes`) tout en permettant la saisie libre.

---

### ✅ T-052 · Toast de succès absent après création/modification
**Fichiers** : tous les formulaires
Quand une action réussit (créer commande, modifier article, enregistrer vente), aucun feedback visuel de succès n'est affiché. Le modal se ferme sans confirmation.
**Fix** : Ajouter `toast.success('Commande créée')`, `toast.success('Article modifié')`, etc. dans chaque `handleSubmit` après la réponse API positive.

---

### ✅ T-053 · Filtres statuts incohérents entre pages
**Fichiers** : `app/articles/page.tsx` (boutons toggle), `components/commandes/ListeCommandes.tsx` (select dropdown)
Le filtre par statut utilise des boutons sur la page articles et un `<select>` sur la page commandes. L'UX n'est pas uniforme.
**Fix** : Unifier sur le même pattern. Les boutons toggle sont mieux pour peu d'options — adopter ce pattern sur la page commandes aussi.

---

### ✅ T-054 · Formulaire commande ouvert en taille `md` au lieu de `lg`
**Fichier** : `app/commandes/page.tsx`
Le modal de création de commande (qui contient fournisseur, date, statut, + lignes articles + lignes frais) s'ouvre en taille `md` par défaut, ce qui force beaucoup de scroll dans un espace trop petit.
**Fix** : Ajouter `size="lg"` ou `size="xl"` sur le `<Modal>` de création de commande dans `app/commandes/page.tsx`.

---

### ✅ T-055 · Pas de skeleton dans la page commande détail
**Fichier** : `app/commandes/[id]/page.tsx`
Pendant le chargement du détail d'une commande, la page affiche un simple texte "Chargement…". Toutes les autres pages ont des squelettes animés.
**Fix** : Remplacer le texte de chargement par des squelettes cohérents avec le reste de l'app.

---

### ✅ T-056 · Pas de toast d'erreur si le fetch échoue sur `/commandes/[id]`
**Fichier** : `app/commandes/[id]/page.tsx`
Si `fetchCommande()` échoue (réseau, serveur), aucun message d'erreur n'est affiché.
**Fix** : Ajouter un `try/catch` avec `toast.error('Impossible de charger la commande')` et afficher un état d'erreur avec bouton "Réessayer".

---

### ✅ T-057 · Condition confuse dans FormulaireVente pour les champs vente
**Fichier** : `components/articles/FormulaireVente.tsx`
La condition `{(mode === 'vendu' || article.statut === 'En vente') && (...)}` pour afficher les champs prix réel/frais/date est difficile à comprendre et crée des cas d'usage inattendus.
**Fix** : Simplifier la logique — n'afficher les champs de vente finale que si `mode === 'vendu'`. La mise en vente (mode `vente`) n'a besoin que de `prixVente` et `plateforme`.

---

### ✅ T-058 · Badge rôle utilisateur non standardisé
**Fichier** : `app/parametres/utilisateurs/page.tsx`
L'affichage du rôle utilisateur utilise un badge inline custom (classes Tailwind en dur) au lieu du composant `<Badge>` réutilisable.
**Fix** : Étendre `Badge.tsx` pour supporter les rôles (`admin`, `viewer`) ou créer un composant `<RoleBadge>` cohérent avec le design system.

---

---

### ✅ T-059 · Sidebar collapsible sur desktop
**Fichier** : `components/ClientLayout.tsx`, `components/Sidebar.tsx`
La sidebar est toujours visible et prend 256px en permanence. Impossible de la fermer pour gagner de l'espace sur desktop.
**Fix** : Ajouter un bouton toggle pour réduire/étendre la sidebar sur desktop. État persisté en localStorage.

---

### ✅ T-060 · Bouton déconnexion absent sur certaines pages (statistiques, objectifs)
**Fichier** : `components/Sidebar.tsx`
Sur les pages avec beaucoup de contenu (statistiques, objectifs), le footer de la sidebar (avec le bouton déconnexion) est poussé hors de l'écran car la sidebar prend `h-full` de la page entière au lieu de `h-screen`.
**Fix** : Passer la sidebar en `sticky top-0 h-screen` sur desktop pour qu'elle reste dans le viewport quelle que soit la hauteur du contenu.

---

### ✅ T-061 · Modification de mot de passe dans la gestion utilisateurs
**Fichier** : `app/parametres/utilisateurs/page.tsx`
Aucun moyen de changer le mot de passe d'un utilisateur depuis l'interface. Seule la création avec un mot de passe initial est possible.
**Fix** : Ajouter un bouton "Changer le mot de passe" sur chaque ligne utilisateur qui ouvre une modale avec les champs nouveau mot de passe + confirmation. Appelle `PATCH /api/users/[id]` avec `motDePasse`.

---

*Fichier mis à jour le 2026-03-22.*
