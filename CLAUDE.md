# AMLuxe — App de gestion achat/revente de sacs de luxe

## Objectif
Application web de gestion complète du cycle achat → revente de sacs de luxe
(fournisseur → réception → mise en vente → vente → stats).

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Prisma + **PostgreSQL** (hébergé sur Railway)
- NextAuth v4 (authentification par credentials)
- bcryptjs (hash mots de passe)
- Recharts (graphiques statistiques)
- xlsx (export Excel)

## Fonctionnalités implémentées
1. Gestion des commandes fournisseurs (statuts : En préparation / En livraison / Reçue)
2. Articles par commande (marque, modèle, prix achat, état, ref fournisseur)
3. Taxes et frais par commande (douane, livraison, autres)
4. Mise en vente des articles (prix, plateforme : Vinted, Leboncoin...)
5. Vente et livraison client (prix réel, frais de vente)
6. Module statistiques (CA, bénéfice, marges, rentabilité par modèle/fournisseur)
7. Export Excel (par commande et global)
8. **Authentification** — page login animée, sessions JWT, middleware de protection
9. **Gestion des utilisateurs** — CRUD à `/parametres/utilisateurs`

## Style UI
- Dashboard pro, épuré, dark mode (`#0f0f13`)
- Sidebar navigation avec sections Menu / Paramètres + bouton déconnexion
- Tableaux clairs avec filtres et statuts colorés
- Page login : glassmorphism, orbes animées, particules flottantes, shimmer

## Architecture
```
/app
  /api
    /auth/[...nextauth]  → Handler NextAuth
    /articles            → CRUD articles
    /commandes           → CRUD commandes
    /frais               → CRUD frais
    /users               → CRUD utilisateurs
  /login                 → Page de connexion (publique)
  /commandes             → Liste et détail commandes
  /articles              → Liste articles
  /statistiques          → Dashboard stats
  /export                → Export Excel
  /parametres/utilisateurs → Gestion des utilisateurs
/components
  ClientLayout.tsx       → Layout conditionnel (sidebar masquée sur /login)
  Sidebar.tsx            → Navigation principale
  /ui, /articles, /commandes → Composants métier
/lib
  auth.ts                → Config NextAuth (authOptions)
  prisma.ts              → Client Prisma singleton
/prisma
  schema.prisma          → Modèles : Commande, Article, Frais, User
  seed.js                → Seed admin par défaut
/types
  next-auth.d.ts         → Extension des types de session
middleware.ts            → Protection de toutes les routes sauf /login et /api/auth
```

## Déploiement
- **Hébergeur** : Railway — https://amluxe-production.up.railway.app
- **Build** : Dockerfile custom (`node:22-slim`) — ne pas utiliser Nixpacks/Railpack (problème de binding natif Tailwind)
- **DB** : PostgreSQL Railway (utiliser l'URL interne pour la prod, l'URL publique en local)
- **Variables Railway requises** : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

## Commandes utiles
```bash
npm run dev              # Démarrage local
npm run db:migrate       # Nouvelle migration Prisma
npm run db:seed          # Créer l'admin par défaut (admin@amluxe.fr / Admin2024!)
npm run db:studio        # Interface Prisma Studio
npx prisma migrate dev --name <nom>  # Créer une migration nommée
```

## Règles importantes
- **Ne jamais changer le provider Prisma** — rester sur PostgreSQL
- **Ne pas supprimer le Dockerfile** — critique pour le build Railway
- **Toujours protéger les routes API** avec `getServerSession(authOptions)`
- **Langue** : tout en français (interface, commentaires, noms de variables métier)
- **Commits** : toujours commiter + pusher après une fonctionnalité terminée
- **Tests** : toute nouvelle fonctionnalité doit être couverte par un test Playwright dans `tests/e2e/`. Ajouter les cas dans le fichier existant correspondant (ex: `05-articles.spec.ts` pour les articles) ou créer un nouveau fichier numéroté si la feature est dans une nouvelle zone.

## Vision évolutive
L'app est pensée pour évoluer vers l'automatisation :
tracking colis, sync emails, connexion Vinted, stats temps réel.
Prévoir une architecture modulaire et extensible.
