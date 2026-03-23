# AMLuxe — Contexte Claude (état vivant du projet)

> Ce fichier est à mettre à jour après chaque fonctionnalité terminée ou décision technique importante.
> Il complète `CLAUDE.md` (architecture/stack) en capturant **l'état fonctionnel actuel** et les **décisions prises**.

---

## 🟢 Fonctionnalités implémentées (état 2026-03-23)

| Zone | Ce qui est fait |
|------|----------------|
| **Commandes** | CRUD complet, statuts (En préparation / En livraison / Reçue), filtres avancés, suppression bulk avec transaction, modale de confirmation |
| **Articles** | CRUD complet, statuts (En stock / En vente / Vendu / En retour / Endommagé / Litige), filtres marque/plateforme/statut/prix, bouton modifier depuis `/articles` |
| **Frais** | CRUD par commande, champ description visible, types centralisés dans `constants/statuts.ts` |
| **Vente** | Formulaire vente avec prix réel, frais, plateforme, date — logique simplifiée (mode `vendu` uniquement pour les champs prix réel) |
| **Tracking** | Détection transporteur par regex (UPS, FedEx, DHL, Chronopost, Colissimo, GLS, Mondial Relay, La Poste). Widget cliquable `TrackingWidget.tsx`. **Aucun appel API** — lien direct vers site transporteur. |
| **Statistiques** | KPIs (CA, bénéfice, marge), graphique LineChart évolution mensuelle, top marques, top fournisseurs, top plateformes, useMemo |
| **Dashboard** | Page d'accueil avec KPIs mois en cours, dernières commandes, articles en attente |
| **Export** | Excel par commande et global (xlsx), import Excel avec validation |
| **Auth** | NextAuth v4 JWT, login animé, middleware de protection, session 8h, RBAC minimal |
| **Utilisateurs** | CRUD `/parametres/utilisateurs`, changement de mot de passe, badges rôles |
| **UX** | Toasts Sonner (unifié), skeletons sur toutes les pages, breadcrumb, sidebar collapsible, scroll restauré, feedback tactile mobile |
| **Mobile** | Responsive sur toutes les pages, overflow-x-auto sur filtres, cards mobile pour tableaux, Modal p-3 sm:p-6 |
| **Accessibilité** | `prefers-reduced-motion`, font-size ≥ 16px sur iOS |

---

## 🔴 Tickets ouverts (non ✅)

| Ticket | Description | Priorité |
|--------|-------------|----------|
| T-015 | Pagination backend sur articles et commandes | 🟡 |
| T-019 | Export PDF des commandes | 🟡 |
| T-020 | Page réinitialisation mot de passe | 🟡 |
| T-023 | Composant `<Table>` générique réutilisable | 🟡 |
| T-025 | Soft delete (deletedAt) commandes et articles | 🟡 |
| T-026 | Historique des modifications d'un article | 🟡 |
| T-036 | Notifications temps réel (WebSocket/SSE) | 🟢 |
| T-037 | Intégration Vinted / Leboncoin | 🟢 |
| T-039 | Multi-devise (EUR, USD, GBP) | 🟢 |
| T-040 | Mode "Remember Me" (30j) sur login | 🟢 |
| T-041 | Tests unitaires Jest + E2E Playwright | 🟢 |
| T-042 | Fichier `.env.example` | 🟢 |
| T-043 | Composant `<Icon>` réutilisable | 🟢 |
| T-044 | Audit log (qui a fait quoi) | 🟢 |
| T-045 | Support mobile amélioré tableaux | 🟢 |

---

## ⚙️ Décisions techniques importantes

### Tracking — pas d'API temps réel
**Décision** : Le TrackingWidget ne fait aucun appel API. Il détecte le transporteur par regex et génère un lien cliquable vers le site officiel.

**Pourquoi** : TrackingMore (API v4) a été testé. Le plan gratuit ne supporte pas les endpoints GET — seul `POST /v4/trackings/create` fonctionnerait (une fois par numéro). Toutes les tentatives de récupérer le statut ont échoué. L'utilisateur a décidé que le lien cliquable est suffisant.

**Fichiers** : `lib/tracking.ts`, `components/ui/TrackingWidget.tsx`
**Route supprimée** : `app/api/tracking/[numero]/route.ts` (n'existe plus)
**Variable inutilisée** : `TRACKINGMORE_API_KEY` dans `.env` (peut être supprimée)

---

### Toasts — Sonner uniquement
**Décision** : Sonner est le seul système de toast. Le composant custom `Toast.tsx` a été supprimé.

**Partout** : `import { toast } from 'sonner'` → `toast.success(...)` / `toast.error(...)`

---

### Calculs bénéfice — `lib/calculs.ts`
**Décision** : Toute la logique de calcul est centralisée dans `lib/calculs.ts` avec `calculerBenefice()`. Ne pas recalculer inline dans les pages.

---

### Statuts et constantes — `constants/statuts.ts`
**Décision** : `STATUTS_COMMANDE`, `STATUTS_ARTICLE`, `TYPES_FRAIS`, `ETATS` sont importés depuis `constants/statuts.ts`. Ne pas redéclarer localement dans les composants.

---

### Sidebar collapsible
**Décision** : État collapsed persisté dans `localStorage`. Sur mobile, la sidebar se ferme automatiquement via `useEffect` sur `pathname` dans `ClientLayout`.

---

### Prisma — champs inutilisés sur Commande
Les champs `trackingData Json?` et `trackingUpdatedAt DateTime?` existent dans le schema (migration appliquée) mais ne sont pas utilisés dans le code. Ils peuvent servir si le tracking API est réactivé un jour.

---

### Sécurité API
**Règle** : Toutes les routes API (GET, POST, PUT, DELETE) vérifient `getServerSession(authOptions)` avant tout traitement. Ne jamais oublier sur une nouvelle route.

---

## 📁 Fichiers clés à connaître

```
lib/
  tracking.ts         → Détection transporteur par regex (8 transporteurs)
  calculs.ts          → calculerBenefice() centralisé
  auth.ts             → Config NextAuth (authOptions)
  prisma.ts           → Client Prisma singleton (logs désactivés en prod)

constants/
  statuts.ts          → STATUTS_COMMANDE, STATUTS_ARTICLE, TYPES_FRAIS, ETATS

components/ui/
  TrackingWidget.tsx  → Affiche transporteur + numéro cliquable (client-side only)
  Modal.tsx           → Modale réutilisable, p-3 sm:p-6 sur overlay

app/
  page.tsx            → Dashboard avec KPIs mois + dernières commandes
  statistiques/       → Stats complètes avec useMemo + LineChart
  commandes/[id]/     → Détail commande avec tracking, articles, frais, marge
```

---

## 🚫 Pièges à éviter

1. **Ne jamais passer une fonction Prisma dans `NextResponse.json()`** — les fonctions sont stripées par JSON.stringify. Toujours sérialiser les données (URLs pré-calculées, pas de fonctions dans les objets API).

2. **Ne jamais modifier le provider Prisma** — rester sur PostgreSQL.

3. **Ne jamais supprimer le Dockerfile** — critique pour Railway (problème de binding natif Tailwind avec Nixpacks).

4. **Toujours travailler sur `develop`**, jamais directement sur `main`. Merger via PR.

5. **Ne pas régénérer Prisma client avec le dev server actif** — le DLL est locké. Arrêter le serveur d'abord.

6. **TrackingMore plan gratuit** — seul `POST /v4/trackings/create` fonctionne. Les endpoints GET retournent `data: []`. Ne pas retenter l'intégration sans passer à un plan payant.

---

## 🔄 Workflow de mise à jour de ce fichier

Après chaque session de travail :
- Cocher les tickets terminés dans la section "Tickets ouverts"
- Ajouter une ligne dans "Fonctionnalités implémentées"
- Documenter toute nouvelle décision technique dans "Décisions techniques"
- Mettre à jour la date en haut du fichier
