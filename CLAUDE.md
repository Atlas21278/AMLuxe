# AMLuxe — App de gestion achat/revente de sacs de luxe

## Objectif
Application web de gestion complète du cycle achat → revente de sacs de luxe
(fournisseur → réception → mise en vente → vente → stats).

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Prisma + **PostgreSQL** (hébergé sur Railway)
- NextAuth v4 (authentification par credentials)
- bcryptjs (hash mots de passe, salt=12)
- Recharts (graphiques statistiques)
- xlsx (export/import Excel)
- jsPDF + jspdf-autotable (export PDF commandes)
- sonner (toast notifications)
- framer-motion (animations NavigationProgress)
- zod (validation — présent, peu utilisé systématiquement)

## Fonctionnalités implémentées
1. **Commandes fournisseurs** — CRUD avec statuts (En préparation / En livraison / Reçue), tracking, notes
2. **Articles par commande** — marque, modèle, prix achat, état, numéro de série, photos
3. **Frais par commande** — douane, livraison, autres (obligatoires avant mise en vente)
4. **Mise en vente** — prix, plateforme (Vinted, Leboncoin...), lien annonce
5. **Vente et livraison** — prix réel, frais de vente, date vente
6. **Module statistiques** — CA, bénéfice, marges, rentabilité par modèle/fournisseur/plateforme, évolution mensuelle
7. **Export Excel multi-sheets** — Tableau de bord, par marque, articles, commandes, frais, guide import
8. **Import Excel** — parsing, validation, rate limited (5/5min), preview avant import
9. **Export PDF** — par commande, avec KPIs et tableaux (jsPDF)
10. **Authentification** — page login animée, sessions JWT, middleware de protection, rate limiting (5/15min)
11. **Gestion des utilisateurs** — CRUD à `/parametres/utilisateurs`, soft delete
12. **Journal d'audit** — table `Audit` + `ArticleHistorique`, visible à `/parametres/audit`
13. **Abonnements mensuels** — coûts fournisseur/plateforme à `/parametres/abonnements`
14. **Notifications temps réel** — SSE via `/api/notifications/stream`, hook `useNotifications`
15. **Raccourcis clavier** — `useKeyboardShortcuts` (T-073), aide via `ShortcutsHelp`
16. **Page Objectifs** — `/objectifs` (feature WIP, non documentée)
17. **UX** — NavigationProgress bar, skeleton loaders, page fade-in, 401 auto-redirect vers login

## Style UI
- Dashboard pro, épuré, dark mode (`#0f0f13`)
- Accent couleur : purple (`#7c3aed`)
- Sidebar navigation avec sections Menu / Paramètres + bouton déconnexion (collapsible desktop, drawer mobile)
- Tableaux clairs avec filtres et statuts colorés
- Page login : glassmorphism, orbes animées, particules flottantes, shimmer

## Architecture
```
/app
  /api
    /auth/[...nextauth]      → Handler NextAuth
    /articles                → CRUD articles + bulk + photos
    /commandes               → CRUD commandes + bulk
    /frais                   → CRUD frais
    /users                   → CRUD utilisateurs
    /import                  → Import Excel bulk (rate limited)
    /audit                   → Lecture journal audit
    /config                  → Config dynamique clé/valeur
    /abonnements             → Coûts mensuels
    /notifications/stream    → SSE stream temps réel
  /login                     → Page de connexion (publique)
  /mot-de-passe-oublie       → Page reset MDP (non fonctionnel, WIP)
  /commandes                 → Liste + détail commandes
  /articles                  → Liste articles avec filtres avancés
  /statistiques              → Dashboard stats + Recharts
  /export                    → Export/Import Excel
  /objectifs                 → Page objectifs (WIP)
  /parametres
    /utilisateurs            → Gestion des utilisateurs
    /audit                   → Journal d'audit
    /abonnements             → Coûts mensuels
/components
  ClientLayout.tsx           → Layout conditionnel (sidebar masquée sur /login) + notifications SSE + 401 interceptor
  Sidebar.tsx                → Navigation principale (mounted guard anti-SSR crash)
  ImportModal.tsx            → Modal import fichier Excel
  /ui
    Badge.tsx                → Statuts colorés (badge "En vente" cliquable)
    Modal.tsx                → Dialog wrapper avec backdrop
    Combobox.tsx             → Select autocomplete
    NavigationProgress.tsx   → Barre progression violette (framer-motion)
    PhotoGallery.tsx         → Lightbox photos articles
    ShortcutsHelp.tsx        → Modal aide raccourcis clavier
    TrackingWidget.tsx       → Widget tracking colis
  /articles
    FormulaireArticle.tsx    → Création/édition article
    FormulaireVente.tsx      → Mise en vente + enregistrement vente
    PhotosArticle.tsx        → Upload/gestion photos
  /commandes
    FormulaireCommande.tsx   → Création/édition commande
    FormulaireFrais.tsx      → Ajout frais
    ListeCommandes.tsx       → Tableau commandes avec filtres, pagination, URL sync
/hooks
  useNotifications.ts        → Écoute SSE + auto-reconnect 5s
  useKeyboardShortcuts.ts    → Raccourcis clavier globaux
/lib
  auth.ts                    → Config NextAuth (credentials provider, JWT, rate limit in-memory)
  prisma.ts                  → Client Prisma singleton (logs queries en dev only)
  audit.ts                   → logAudit() → table Audit (never blocks)
  events.ts                  → Bus SSE in-memory (subscribeToEvents, emitEvent) — single-pod only
  tracking.ts                → Tracking colis externe
/constants
  statuts.ts                 → Énums statuts commandes/articles
/data
  marques.ts                 → Liste marques de luxe
/prisma
  schema.prisma              → 8 modèles : Commande, Article, ArticleHistorique, Frais, User, Audit, AbonnementMensuel, Config
  seed.js                    → Seed admin par défaut
/types
  next-auth.d.ts             → Extension des types de session
/tests
  global-setup.ts            → Login admin → save storageState dans %TEMP%
  /e2e                       → 8 fichiers spec (01-auth à 08-navigation) — 85/85 passants
  /helpers                   → Utilitaires tests (createTestCommande, etc.)
middleware.ts                → Protection routes (tout sauf /login, /mot-de-passe-oublie, /api/auth)
```

## Modèle de données (8 tables Prisma)

| Modèle | Rôle | Soft delete |
|--------|------|-------------|
| `Commande` | Commande fournisseur | ✓ `deletedAt` |
| `Article` | Article avec statut vente | ✓ `deletedAt` |
| `ArticleHistorique` | Audit trail modifications article | — |
| `Frais` | Frais par commande (cascade delete) | — |
| `User` | Utilisateurs authentifiés | `actif` flag |
| `Audit` | Journal global CREATE/UPDATE/DELETE | — |
| `AbonnementMensuel` | Coûts mensuels (clé YYYY-MM unique) | — |
| `Config` | Config dynamique clé/valeur | — |

## Déploiement
- **Hébergeur** : Railway — https://amluxe-production.up.railway.app
- **Build** : Dockerfile custom (`node:22-slim`) — ne pas utiliser Nixpacks/Railpack (problème de binding natif Tailwind @tailwindcss/oxide)
- **DB** : PostgreSQL Railway (URL interne pour prod, URL publique en local)
- **Branches** :
  - `develop` → staging Railway (deploy automatique)
  - `main` → production Railway (deploy automatique)
  - Merger staging → prod : `git checkout main && git merge develop && git push origin main && git checkout develop`
- **Variables Railway requises** : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

## Commandes utiles
```bash
npm run dev              # Démarrage local
npm run db:migrate       # Nouvelle migration Prisma
npm run db:seed          # Créer l'admin par défaut (admin@amluxe.fr / Admin2024!)
npm run db:studio        # Interface Prisma Studio
npx prisma migrate dev --name <nom>  # Créer une migration nommée
npx playwright test      # Lancer tous les tests e2e
npx playwright test tests/e2e/05-articles.spec.ts  # Test spécifique
```

## Tests E2E (Playwright)
- **85/85 tests passants** (01-auth à 08-navigation)
- Auth stockée dans `%TEMP%/amluxe-test-auth.json` (hors du répertoire surveillé par webpack)
- webpack `watchOptions.ignored` avec RegExp (pas glob) pour éviter Fast Refresh pendant les tests
- Navigation tests : utiliser `page.goto(href)` plutôt que SPA click (résistant au Fast Refresh)
- Boutons d'action : `title="Modifier"`, `title="Supprimer"` (pas de texte complet)
- Vues dupliquées mobile/desktop : scoper les sélecteurs sur `table` pour cibler le desktop

## Règles importantes
- **Ne jamais changer le provider Prisma** — rester sur PostgreSQL
- **Ne pas supprimer le Dockerfile** — critique pour le build Railway
- **Toujours protéger les routes API** avec `getServerSession(authOptions)`
- **Langue** : tout en français (interface, commentaires, noms de variables métier)
- **Commits** : toujours commiter + pusher sur `develop` après une fonctionnalité terminée
- **Tests** : toute nouvelle fonctionnalité doit être couverte par un test Playwright dans `tests/e2e/`. Ajouter les cas dans le fichier existant correspondant ou créer un nouveau fichier numéroté si la feature est dans une nouvelle zone.
- **Notifications SSE** : `lib/events.ts` fonctionne seulement en single-pod (pas de Redis). Si Railway scale → plusieurs pods, il faudra Redis Pub/Sub.
- **Rate limiting** : in-memory (perdu au redéploiement) — acceptable single-pod

## Points WIP / Features non finies
- **Mot de passe oublié** (T-103) : page `/mot-de-passe-oublie` existe mais endpoint absent — nécessite Resend pour les emails
- **Photos en base64** (T-102) : stockées dans PostgreSQL (`photos String[]`) — fonctionne mais fait grossir la DB, lent. Migrer vers Uploadthing
- **Monitoring erreurs** (T-104) : aucune visibilité sur les erreurs prod — intégrer Sentry
- **MCP PostgreSQL** (T-105) : pas encore branché dans Claude Code
- **MCP GitHub** (T-106) : pas encore branché dans Claude Code
- **Page Objectifs** : `/objectifs` est implémentée (745 lignes) — objectifs mensuels, barres de progression, gamification

## Sécurité récente
- **NEXTAUTH_SECRET** (T-107 ✅) : remplacé par une clé aléatoire 256 bits sur Railway (2026-03-26)
- **Tests isolés sur staging** : les tests Playwright tournent sur la DB staging (`caboose.proxy.rlwy.net`) depuis `.env.test.local`, jamais sur la prod

## Vision évolutive
L'app est pensée pour évoluer vers l'automatisation :
tracking colis, sync emails, connexion Vinted, stats temps réel.
Prévoir une architecture modulaire et extensible.
