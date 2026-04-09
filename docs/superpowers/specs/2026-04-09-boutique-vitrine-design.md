# Boutique Vitrine — Design Spec
**Date** : 2026-04-09  
**Statut** : Approuvé  

---

## Contexte

AMLuxe est une app admin de gestion achat/revente de sacs de luxe. L'objectif est de créer un site vitrine public où les clients peuvent voir et acheter les sacs directement. Quand un article est marqué "En vente" dans AMLuxe, il apparaît automatiquement sur la boutique. Quand il est acheté via Stripe, il repasse automatiquement à "Vendu" dans AMLuxe.

---

## Décisions clés

| Décision | Choix retenu |
|----------|-------------|
| Architecture | Site Next.js séparé, même base PostgreSQL via API publique |
| Paiement | Stripe Checkout (pas de panier, "Acheter maintenant" par article) |
| Style par défaut | Crème Éditorial (fond ivoire, accents or/camel, typographie serif) |
| Dark mode | Dark & Gold (fond noir, accents champagne) — toggle sur le site |
| URL initiale | `ma-boutique.up.railway.app` |
| Déploiement | Nouveau service Railway, même projet |

---

## Architecture

### Vue d'ensemble

```
AMLuxe Admin (existant)          Boutique Vitrine (nouveau)         Stripe
─────────────────────           ─────────────────────────          ──────
GET /api/public/articles ──────► page d'accueil + fiche produit
                                 POST /api/checkout ───────────────► Stripe Checkout
POST /api/webhooks/stripe ◄─────────────────────────────────────── webhook paiement
  → Article.statut = "Vendu"
```

### Nouveau dépôt

- Nom : `amluxe-boutique`
- Stack : Next.js 14 (App Router) + TypeScript + Tailwind CSS v4
- Déployé sur Railway comme service séparé
- La boutique **n'accède pas directement à la DB** — elle passe exclusivement par l'API publique d'AMLuxe. Zéro Prisma dans la boutique.
- Variables d'environnement requises :
  - `NEXT_PUBLIC_AMLUXE_API_URL` — URL de l'app AMLuxe (ex: `https://amluxe-production.up.railway.app`)
  - `STRIPE_SECRET_KEY` — clé Stripe secrète
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — clé Stripe publique
  - `STRIPE_WEBHOOK_SECRET` — secret du webhook Stripe (pour vérifier les webhooks entrants si on en ajoute côté boutique)

---

## Modifications dans AMLuxe (app existante)

### 1. Route API publique — `GET /api/public/articles`

Retourne uniquement les articles avec `statut = "En vente"` et `deletedAt = null`.

Champs exposés (pas de données sensibles) :
```ts
{
  id: number
  marque: string
  modele: string
  etat: string        // "Neuf", "Très bon état", etc.
  prixVente: number
  plateforme: string | null
  lienAnnonce: string | null
  photos: string[]    // URLs Uploadthing uniquement (pas de base64)
  createdAt: string
}
```

**Champs exclus** : `prixAchat`, `prixVenteReel`, `fraisVente`, `commandeId`, `notes`

Pas d'authentification sur ce endpoint — il est public par design.
Cache HTTP : `Cache-Control: public, max-age=60, stale-while-revalidate=300`

### 2. Route API publique — `GET /api/public/articles/[id]`

Même champs que la liste, pour une fiche produit.

### 3. Route webhook Stripe — `POST /api/webhooks/stripe`

Appelée par Stripe après paiement confirmé (`checkout.session.completed`).

Actions :
1. Vérifier la signature Stripe (`stripe.webhooks.constructEvent`)
2. Récupérer `articleId` depuis `session.metadata`
3. Mettre à jour l'article : `statut = "Vendu"`, `prixVenteReel = session.amount_total / 100`, `dateVente = now()`
4. Logger dans la table `Audit`
5. Émettre un événement SSE via `lib/events.ts` (notification temps réel dans l'admin)

---

## Site Boutique — Pages

### Page 1 — Accueil `/`

**Sections :**
- Nav : logo + liens (Collection, À propos, Contact) + toggle Dark Mode
- Hero : titre serif + sous-titre + CTA "Découvrir la collection"
- Grille articles : cards avec photo, marque, modèle, prix, état — animation fade-in au scroll
- Footer : mentions légales, contact

**Data fetching** : `fetch('/api/public/articles')` avec `next: { revalidate: 60 }` (ISR — revalidation automatique toutes les 60 secondes)

**Comportement** : si 0 articles en vente → message "Aucune pièce disponible pour le moment, revenez bientôt."

### Page 2 — Fiche produit `/sacs/[id]`

**Sections :**
- Galerie photos (lightbox au clic)
- Marque, modèle, état (badge coloré), prix
- Description optionnelle (champ `notes` de l'article si renseigné)
- Bouton "Acheter ce sac — X €" → appelle `POST /api/checkout`
- Lien retour vers la collection

**Comportement si article non disponible** : redirect vers `/` avec message toast.

### Page 3 — Confirmation `/confirmation`

Affichée après retour de Stripe (`?session_id=...`).

- Vérification du paiement via `stripe.checkout.sessions.retrieve(session_id)`
- Affichage : récap commande (marque, modèle, prix), message de remerciement, email de contact pour la livraison

### Page 4 — À propos `/a-propos` (statique)

Texte de présentation de la boutique. À remplir manuellement.

### Page Erreur — `/annulation`

Affiché si le client annule sur Stripe. Message simple + retour à la collection.

---

## Flux de paiement Stripe

```
Client clique "Acheter"
  → POST /api/checkout { articleId }
    → Vérifie que l'article est toujours "En vente"
    → stripe.checkout.sessions.create({
        line_items: [{ price_data: { currency: 'eur', unit_amount: prixVente * 100, ... }, quantity: 1 }],
        mode: 'payment',
        metadata: { articleId },
        success_url: '/confirmation?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: '/annulation',
      })
    → Retourne { url } → redirect client
  → Stripe Checkout (page Stripe hébergée)
  → Paiement OK → webhook → AMLuxe marque "Vendu"
  → Client redirigé vers /confirmation
```

**Protection contre la double vente** : avant de créer la session Stripe, on vérifie que `article.statut === "En vente"`. Si déjà vendu → erreur 409 + message au client.

---

## Design & Animations

### Thème Crème Éditorial (défaut)

| Élément | Valeur |
|---------|--------|
| Fond | `#faf8f4` |
| Texte principal | `#1a1a1a` |
| Accent | `#9b7e5a` (camel doré) |
| Fond card | `#ffffff` |
| Bordure | `#ede6db` |
| Typographie titres | Georgia / serif |
| Typographie corps | system-ui / sans-serif |

### Thème Dark & Gold (dark mode)

| Élément | Valeur |
|---------|--------|
| Fond | `#080808` |
| Texte principal | `#ffffff` |
| Accent | `#c9a96e` (or champagne) |
| Fond card | `#0f0f0f` |
| Bordure | `#1f1f1f` |
| Typographie titres | Georgia / serif |

### Animations (Framer Motion ou CSS)

- **Fade-in au scroll** : chaque card entre avec `opacity: 0 → 1` + `translateY(16px → 0)`, délai échelonné
- **Hover card** : légère élévation (`translateY(-4px)`) + ombre douce, transition 200ms
- **Transition de page** : fondu entre les pages (150ms)
- **Hero** : titre révélé mot par mot au premier chargement (animation 800ms)
- **Respect `prefers-reduced-motion`** : toutes les animations désactivées si activé

### Toggle Dark Mode

- Bouton icône soleil/lune en haut à droite de la nav
- État persisté dans `localStorage`
- Classe `dark` sur `<html>` avec Tailwind dark mode

---

## Structure du projet boutique

```
amluxe-boutique/
  app/
    layout.tsx              → Providers (thème, Sonner)
    page.tsx                → Accueil + grille articles
    sacs/[id]/page.tsx      → Fiche produit
    confirmation/page.tsx   → Page post-paiement
    annulation/page.tsx     → Page annulation
    a-propos/page.tsx       → Page statique
    api/
      checkout/route.ts     → Crée session Stripe
  components/
    Navbar.tsx              → Navigation + dark mode toggle
    ArticleCard.tsx         → Card article (grille + animations)
    PhotoGallery.tsx        → Galerie + lightbox
    Footer.tsx
  lib/
    stripe.ts               → Client Stripe singleton
    articles.ts             → fetch vers NEXT_PUBLIC_AMLUXE_API_URL/api/public/articles
  types/
    article.ts              → Type ArticlePublic
  next.config.js
  tailwind.config.ts
  Dockerfile                → Pour Railway
```

---

## Déploiement Railway

1. Nouveau service Railway dans le même projet
2. Connecter le dépôt `amluxe-boutique`
3. Même `DATABASE_URL` que AMLuxe (variable partagée ou copiée)
4. Ajouter les variables Stripe
5. Configurer le webhook Stripe : `https://amluxe-production.up.railway.app/api/webhooks/stripe`
6. Générer le domaine Railway : `ma-boutique.up.railway.app`

---

## Ce qui n'est PAS dans le scope v1

- Système de compte client (pas d'authentification côté boutique)
- Historique des commandes pour le client
- Notifications email au client (juste l'email Stripe automatique)
- Moteur de recherche / filtres avancés
- Multi-langue
- Domaine personnalisé (prévu en v2)
- Panier multi-articles
