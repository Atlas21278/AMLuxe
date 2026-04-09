# Boutique Vitrine AMLuxe — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un site vitrine public (`amluxe-boutique`) connecté à AMLuxe via une API publique, avec paiement Stripe intégré — quand un article passe "En vente" dans l'admin il apparaît sur la boutique, et quand il est acheté il repasse "Vendu" automatiquement.

**Architecture:** Deux projets distincts : AMLuxe (existant, `E:/AMLuxe`) reçoit 3 nouvelles routes (`/api/public/articles`, `/api/public/articles/[id]`, `/api/webhooks/stripe`) et la boutique (`E:/amluxe-boutique`) est un nouveau Next.js 14 qui fetch ces routes en ISR. Le paiement passe par Stripe Checkout hébergé par Stripe, et le webhook Stripe appelle AMLuxe pour marquer l'article "Vendu".

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v4, Stripe SDK (`stripe`), `next-themes` (dark mode), CSS Intersection Observer (animations scroll).

---

## Fichiers à créer / modifier

### Dans AMLuxe (E:/AMLuxe) — repo existant

| Action | Fichier | Rôle |
|--------|---------|------|
| Modifier | `middleware.ts` | Exclure `/api/public/*` et `/api/webhooks/*` de l'auth |
| Créer | `app/api/public/articles/route.ts` | GET liste articles "En vente" (sans données sensibles) |
| Créer | `app/api/public/articles/[id]/route.ts` | GET fiche article par ID |
| Créer | `app/api/webhooks/stripe/route.ts` | POST webhook Stripe → marque "Vendu" |
| Créer | `tests/e2e/09-api-publique.spec.ts` | Tests Playwright des routes publiques |

### Dans amluxe-boutique (E:/amluxe-boutique) — nouveau repo

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `types/article.ts` | Type `ArticlePublic` partagé |
| Créer | `lib/articles.ts` | Fetch vers AMLuxe API + cache ISR |
| Créer | `lib/stripe.ts` | Client Stripe singleton |
| Créer | `app/globals.css` | Variables CSS thème crème + dark |
| Créer | `components/ThemeProvider.tsx` | next-themes wrapper |
| Créer | `components/Navbar.tsx` | Nav + toggle dark mode |
| Créer | `components/Footer.tsx` | Footer statique |
| Créer | `components/ArticleCard.tsx` | Card avec animation fade-in scroll |
| Créer | `components/PhotoGallery.tsx` | Galerie + lightbox |
| Créer | `app/layout.tsx` | Root layout avec ThemeProvider |
| Créer | `app/page.tsx` | Accueil — hero + grille articles |
| Créer | `app/sacs/[id]/page.tsx` | Fiche produit |
| Créer | `app/api/checkout/route.ts` | POST → crée session Stripe Checkout |
| Créer | `app/confirmation/page.tsx` | Post-paiement |
| Créer | `app/annulation/page.tsx` | Annulation paiement |
| Créer | `app/a-propos/page.tsx` | Page statique |
| Créer | `Dockerfile` | Build Railway |
| Créer | `.env.example` | Variables requises documentées |

---

## Phase 1 — Modifications AMLuxe

### Task 1 : Middleware — Ouvrir les routes publiques

**Fichiers :**
- Modifier : `E:/AMLuxe/middleware.ts`

- [ ] **Ouvrir `E:/AMLuxe/middleware.ts` et remplacer le matcher**

```ts
// E:/AMLuxe/middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/((?!login|mot-de-passe-oublie|api/auth|api/public|api/webhooks|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
```

- [ ] **Vérifier que le dev server compile sans erreur**

```bash
# Dans E:/AMLuxe
npm run dev
# Attendre "Ready" dans les logs
```

- [ ] **Tester manuellement que `/api/public/articles` n'est pas bloqué (même avant sa création)**

```bash
curl http://localhost:3000/api/public/articles
# Attendu : 404 (la route n'existe pas encore — pas 401 "Non autorisé")
```

- [ ] **Commit**

```bash
cd E:/AMLuxe
git add middleware.ts
git commit -m "feat: ouvrir /api/public/* et /api/webhooks/* au middleware auth"
```

---

### Task 2 : Route GET /api/public/articles (liste)

**Fichiers :**
- Créer : `E:/AMLuxe/app/api/public/articles/route.ts`

- [ ] **Créer le fichier**

```ts
// E:/AMLuxe/app/api/public/articles/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const articles = await prisma.article.findMany({
    where: {
      statut: 'En vente',
      deletedAt: null,
    },
    select: {
      id: true,
      marque: true,
      modele: true,
      etat: true,
      prixVente: true,
      plateforme: true,
      lienAnnonce: true,
      photos: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(articles, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
```

- [ ] **Tester la route manuellement**

```bash
curl http://localhost:3000/api/public/articles
# Attendu : tableau JSON (vide [] ou avec articles)
# Vérifier : PAS de prixAchat, PAS de commandeId dans la réponse
```

- [ ] **Commit**

```bash
cd E:/AMLuxe
git add app/api/public/articles/route.ts
git commit -m "feat: GET /api/public/articles — liste articles En vente sans données sensibles"
```

---

### Task 3 : Route GET /api/public/articles/[id] (fiche)

**Fichiers :**
- Créer : `E:/AMLuxe/app/api/public/articles/[id]/route.ts`

- [ ] **Créer le fichier**

```ts
// E:/AMLuxe/app/api/public/articles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const article = await prisma.article.findFirst({
    where: {
      id,
      statut: 'En vente',
      deletedAt: null,
    },
    select: {
      id: true,
      marque: true,
      modele: true,
      etat: true,
      prixVente: true,
      plateforme: true,
      lienAnnonce: true,
      photos: true,
      notes: true,
      createdAt: true,
    },
  })

  if (!article) {
    return NextResponse.json({ error: 'Article non disponible' }, { status: 404 })
  }

  return NextResponse.json(article, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
```

> **Note :** On expose `notes` ici (pour la description fiche produit) — s'assurer que les notes d'articles "En vente" ne contiennent pas de données internes sensibles.

- [ ] **Tester avec un article existant "En vente"**

```bash
# Remplacer 1 par un vrai ID d'article En vente visible dans Prisma Studio
curl http://localhost:3000/api/public/articles/1
# Attendu : objet JSON avec marque, modele, prixVente, etc.

# Tester avec un article inexistant
curl http://localhost:3000/api/public/articles/99999
# Attendu : 404 { "error": "Article non disponible" }

# Tester avec un article "En stock" (ne doit pas être accessible)
curl http://localhost:3000/api/public/articles/<id-article-en-stock>
# Attendu : 404
```

- [ ] **Commit**

```bash
cd E:/AMLuxe
git add app/api/public/articles/[id]/route.ts
git commit -m "feat: GET /api/public/articles/[id] — fiche article publique"
```

---

### Task 4 : Installer Stripe + Route POST /api/webhooks/stripe

**Fichiers :**
- Modifier : `E:/AMLuxe/package.json` (via npm install)
- Créer : `E:/AMLuxe/app/api/webhooks/stripe/route.ts`

- [ ] **Installer le SDK Stripe dans AMLuxe**

```bash
cd E:/AMLuxe
npm install stripe
```

- [ ] **Ajouter la variable d'environnement dans `.env.local`**

```bash
# Ajouter dans E:/AMLuxe/.env.local :
STRIPE_SECRET_KEY=sk_test_...       # Depuis dashboard.stripe.com → Developers → API keys
STRIPE_WEBHOOK_SECRET=whsec_...     # On l'obtiendra à l'étape déploiement ; laisser vide pour l'instant
```

- [ ] **Créer la route webhook**

```ts
// E:/AMLuxe/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Next.js doit recevoir le body brut pour vérifier la signature Stripe
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook Stripe invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const articleId = session.metadata?.articleId
    if (!articleId) {
      console.error('Webhook Stripe : articleId manquant dans metadata')
      return NextResponse.json({ error: 'articleId manquant' }, { status: 400 })
    }

    const id = parseInt(articleId)
    const prixVenteReel = session.amount_total ? session.amount_total / 100 : null

    await prisma.article.update({
      where: { id },
      data: {
        statut: 'Vendu',
        prixVenteReel,
        dateVente: new Date(),
      },
    })

    await logAudit({
      action: 'UPDATE',
      ressource: 'article',
      cible: id,
      details: JSON.stringify({ statut: 'Vendu', prixVenteReel, source: 'stripe-webhook' }),
      userEmail: 'stripe@webhook',
    })
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Tester que la route répond (sans vraie signature Stripe pour l'instant)**

```bash
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'
# Attendu : 400 { "error": "Signature manquante" }
# C'est correct — la vraie vérification se fera avec Stripe CLI en Task 16
```

- [ ] **Commit**

```bash
cd E:/AMLuxe
git add app/api/webhooks/stripe/route.ts package.json package-lock.json
git commit -m "feat: POST /api/webhooks/stripe — marque article Vendu après paiement Stripe"
```

---

### Task 5 : Tests Playwright pour les routes publiques AMLuxe

**Fichiers :**
- Créer : `E:/AMLuxe/tests/e2e/09-api-publique.spec.ts`

- [ ] **Créer le fichier de test**

```ts
// E:/AMLuxe/tests/e2e/09-api-publique.spec.ts
import { test, expect } from '@playwright/test'

// Ces routes sont publiques — pas besoin du storageState auth
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('API publique — /api/public/articles', () => {
  test('GET /api/public/articles retourne un tableau', async ({ request }) => {
    const res = await request.get('/api/public/articles')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('GET /api/public/articles ne contient pas prixAchat ni commandeId', async ({ request }) => {
    const res = await request.get('/api/public/articles')
    const data = await res.json()
    if (data.length > 0) {
      expect(data[0]).not.toHaveProperty('prixAchat')
      expect(data[0]).not.toHaveProperty('commandeId')
      expect(data[0]).not.toHaveProperty('prixVenteReel')
      expect(data[0]).not.toHaveProperty('fraisVente')
    }
  })

  test('GET /api/public/articles/99999 retourne 404', async ({ request }) => {
    const res = await request.get('/api/public/articles/99999')
    expect(res.status()).toBe(404)
  })

  test('GET /api/public/articles/abc retourne 400', async ({ request }) => {
    const res = await request.get('/api/public/articles/abc')
    expect(res.status()).toBe(400)
  })

  test('POST /api/webhooks/stripe sans signature retourne 400', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', { data: {} })
    expect(res.status()).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Signature manquante')
  })
})
```

- [ ] **Lancer les tests (sur staging)**

```bash
cd E:/AMLuxe
npx playwright test tests/e2e/09-api-publique.spec.ts --reporter=list
# Attendu : 5/5 tests passants
```

- [ ] **Commit**

```bash
cd E:/AMLuxe
git add tests/e2e/09-api-publique.spec.ts
git commit -m "test: routes publiques AMLuxe — api/public/articles + webhook stripe"
```

- [ ] **Push develop → staging Railway**

```bash
cd E:/AMLuxe
git push origin develop
# Railway déploie automatiquement — vérifier les logs Railway
```

---

## Phase 2 — Nouveau projet amluxe-boutique

### Task 6 : Scaffolding Next.js + configuration

**Répertoire :** `E:/amluxe-boutique` (nouveau)

- [ ] **Créer le projet Next.js**

```bash
cd E:/
npx create-next-app@14 amluxe-boutique \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd amluxe-boutique
```

- [ ] **Installer les dépendances nécessaires**

```bash
npm install stripe next-themes sonner
npm install --save-dev @types/node
```

- [ ] **Créer `.env.local`**

```bash
# E:/amluxe-boutique/.env.local
NEXT_PUBLIC_AMLUXE_API_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> Récupérer les clés Stripe sur https://dashboard.stripe.com → Developers → API keys. Utiliser les clés **test** (préfixe `sk_test_` et `pk_test_`).

- [ ] **Créer `.env.example`**

```bash
# E:/amluxe-boutique/.env.example
NEXT_PUBLIC_AMLUXE_API_URL=https://amluxe-production.up.railway.app
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- [ ] **Modifier `next.config.js`** pour autoriser les images Uploadthing

```js
// E:/amluxe-boutique/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
```

- [ ] **Vérifier que le projet démarre**

```bash
npm run dev
# Ouvrir http://localhost:3001 — page Next.js par défaut visible
```

- [ ] **Init git + premier commit**

```bash
cd E:/amluxe-boutique
git init
git add .
git commit -m "init: scaffolding Next.js 14 boutique vitrine"
```

---

### Task 7 : Types + lib/articles.ts + lib/stripe.ts

**Fichiers :**
- Créer : `E:/amluxe-boutique/types/article.ts`
- Créer : `E:/amluxe-boutique/lib/articles.ts`
- Créer : `E:/amluxe-boutique/lib/stripe.ts`

- [ ] **Créer le type ArticlePublic**

```ts
// E:/amluxe-boutique/types/article.ts
export interface ArticlePublic {
  id: number
  marque: string
  modele: string
  etat: string
  prixVente: number
  plateforme: string | null
  lienAnnonce: string | null
  photos: string[]
  notes: string | null
  createdAt: string
}
```

- [ ] **Créer lib/articles.ts**

```ts
// E:/amluxe-boutique/lib/articles.ts
import type { ArticlePublic } from '@/types/article'

const API_URL = process.env.NEXT_PUBLIC_AMLUXE_API_URL

export async function getArticles(): Promise<ArticlePublic[]> {
  const res = await fetch(`${API_URL}/api/public/articles`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) return []
  return res.json()
}

export async function getArticle(id: number): Promise<ArticlePublic | null> {
  const res = await fetch(`${API_URL}/api/public/articles/${id}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  return res.json()
}
```

- [ ] **Créer lib/stripe.ts**

```ts
// E:/amluxe-boutique/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})
```

- [ ] **Commit**

```bash
cd E:/amluxe-boutique
git add types/article.ts lib/articles.ts lib/stripe.ts
git commit -m "feat: types ArticlePublic + lib articles/stripe"
```

---

### Task 8 : Thème CSS (Crème Éditorial + Dark & Gold)

**Fichiers :**
- Modifier : `E:/amluxe-boutique/app/globals.css`

- [ ] **Remplacer le contenu de `globals.css`**

```css
/* E:/amluxe-boutique/app/globals.css */
@import "tailwindcss";

/* ── Variables Thème Crème Éditorial (défaut) ── */
:root {
  --bg: #faf8f4;
  --bg-card: #ffffff;
  --bg-nav: rgba(250, 248, 244, 0.92);
  --text: #1a1a1a;
  --text-muted: #888888;
  --accent: #9b7e5a;
  --accent-light: #c4a882;
  --border: #ede6db;
  --shadow: rgba(0, 0, 0, 0.06);
}

/* ── Variables Thème Dark & Gold ── */
.dark {
  --bg: #080808;
  --bg-card: #0f0f0f;
  --bg-nav: rgba(8, 8, 8, 0.92);
  --text: #ffffff;
  --text-muted: #666666;
  --accent: #c9a96e;
  --accent-light: #e8cc9a;
  --border: #1f1f1f;
  --shadow: rgba(201, 169, 110, 0.08);
}

body {
  background-color: var(--bg);
  color: var(--text);
  transition: background-color 0.3s ease, color 0.3s ease;
  font-family: system-ui, -apple-system, sans-serif;
}

/* ── Animation fade-in au scroll ── */
.fade-up {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── Respect prefers-reduced-motion ── */
@media (prefers-reduced-motion: reduce) {
  .fade-up {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* ── Typographie ── */
.font-serif {
  font-family: Georgia, 'Times New Roman', serif;
}

/* ── Utilitaires thème ── */
.bg-theme { background-color: var(--bg); }
.bg-card { background-color: var(--bg-card); }
.text-theme { color: var(--text); }
.text-muted { color: var(--text-muted); }
.text-accent { color: var(--accent); }
.border-theme { border-color: var(--border); }
.accent-bg { background-color: var(--accent); }
```

- [ ] **Modifier `tailwind.config.ts`** pour activer le dark mode basé sur la classe

```ts
// E:/amluxe-boutique/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Commit**

```bash
cd E:/amluxe-boutique
git add app/globals.css tailwind.config.ts
git commit -m "feat: thème CSS crème éditorial + dark & gold + animations fade-up"
```

---

### Task 9 : ThemeProvider + Navbar + Footer

**Fichiers :**
- Créer : `E:/amluxe-boutique/components/ThemeProvider.tsx`
- Créer : `E:/amluxe-boutique/components/Navbar.tsx`
- Créer : `E:/amluxe-boutique/components/Footer.tsx`
- Modifier : `E:/amluxe-boutique/app/layout.tsx`

- [ ] **Créer ThemeProvider.tsx**

```tsx
// E:/amluxe-boutique/components/ThemeProvider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] **Créer Navbar.tsx**

```tsx
// E:/amluxe-boutique/components/Navbar.tsx
'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
      style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-lg tracking-widest uppercase"
          style={{ color: 'var(--text)' }}
        >
          La Boutique
        </Link>

        {/* Liens */}
        <div className="hidden sm:flex items-center gap-8">
          {[
            { href: '/', label: 'Collection' },
            { href: '/a-propos', label: 'À propos' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs tracking-widest uppercase transition-colors hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Toggle dark mode */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Changer le thème"
            className="p-2 rounded-full transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? (
              /* Soleil */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              /* Lune */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Créer Footer.tsx**

```tsx
// E:/amluxe-boutique/components/Footer.tsx
export function Footer() {
  return (
    <footer
      className="mt-24 border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p
          className="font-serif text-sm tracking-widest uppercase"
          style={{ color: 'var(--accent)' }}
        >
          La Boutique
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Sacs de luxe certifiés authentiques · Paiement sécurisé Stripe
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Modifier app/layout.tsx**

```tsx
// E:/amluxe-boutique/app/layout.tsx
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'La Boutique — Sacs de luxe',
  description: 'Découvrez notre sélection de sacs de luxe certifiés authentiques.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
          <Footer />
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Vérifier visuellement**

```bash
# npm run dev doit être lancé sur le port 3001
# Ouvrir http://localhost:3001
# Vérifier : Navbar visible, logo, toggle dark mode fonctionne (bascule fond crème ↔ fond noir)
```

- [ ] **Commit**

```bash
cd E:/amluxe-boutique
git add components/ThemeProvider.tsx components/Navbar.tsx components/Footer.tsx app/layout.tsx
git commit -m "feat: ThemeProvider + Navbar + Footer + layout racine"
```

---

### Task 10 : Composant ArticleCard avec animation

**Fichiers :**
- Créer : `E:/amluxe-boutique/components/ArticleCard.tsx`

- [ ] **Créer le composant**

```tsx
// E:/amluxe-boutique/components/ArticleCard.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type { ArticlePublic } from '@/types/article'

const ETAT_LABELS: Record<string, { label: string; color: string }> = {
  'Neuf':              { label: 'Neuf',              color: '#22c55e' },
  'Très bon état':     { label: 'Très bon état',     color: '#84cc16' },
  'Bon état':          { label: 'Bon état',           color: '#eab308' },
  'État correct':      { label: 'État correct',       color: '#f97316' },
}

export function ArticleCard({ article, delay = 0 }: { article: ArticlePublic; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible') },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const photo = article.photos[0] ?? null
  const etatInfo = ETAT_LABELS[article.etat] ?? { label: article.etat, color: 'var(--text-muted)' }

  return (
    <div
      ref={ref}
      className="fade-up"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Link
        href={`/sacs/${article.id}`}
        className="group block border rounded-sm overflow-hidden transition-all duration-300 hover:-translate-y-1"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
          boxShadow: '0 2px 12px var(--shadow)',
        }}
      >
        {/* Photo */}
        <div
          className="aspect-square overflow-hidden relative"
          style={{ backgroundColor: 'var(--border)' }}
        >
          {photo ? (
            <Image
              src={photo}
              alt={`${article.marque} ${article.modele}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="p-4">
          <p
            className="text-xs tracking-widest uppercase mb-1"
            style={{ color: 'var(--accent)' }}
          >
            {article.marque}
          </p>
          <p
            className="font-serif text-base mb-3"
            style={{ color: 'var(--text)' }}
          >
            {article.modele}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: etatInfo.color }}>
              {etatInfo.label}
            </span>
            <span
              className="font-serif text-base font-medium"
              style={{ color: 'var(--text)' }}
            >
              {article.prixVente?.toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
```

- [ ] **Commit**

```bash
cd E:/amluxe-boutique
git add components/ArticleCard.tsx
git commit -m "feat: ArticleCard avec animation fade-in Intersection Observer"
```

---

### Task 11 : Page d'accueil

**Fichiers :**
- Modifier : `E:/amluxe-boutique/app/page.tsx`

- [ ] **Remplacer le contenu de app/page.tsx**

```tsx
// E:/amluxe-boutique/app/page.tsx
import { getArticles } from '@/lib/articles'
import { ArticleCard } from '@/components/ArticleCard'

export const revalidate = 60

export default async function HomePage() {
  const articles = await getArticles()

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
        <p
          className="text-xs tracking-widest uppercase mb-6"
          style={{ color: 'var(--accent)' }}
        >
          Collection authentifiée
        </p>
        <h1
          className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6"
          style={{ color: 'var(--text)' }}
        >
          Pièces d&apos;exception,
          <br />
          <em style={{ color: 'var(--accent)' }}>authenticité garantie</em>
        </h1>
        <p
          className="text-sm tracking-wide max-w-md mx-auto mb-10"
          style={{ color: 'var(--text-muted)' }}
        >
          Sacs de luxe sélectionnés avec soin · Paiement 100% sécurisé · Livraison assurée
        </p>
        <a
          href="#collection"
          className="inline-block border px-8 py-3 text-xs tracking-widest uppercase transition-all duration-300 hover:opacity-70"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          Découvrir la collection
        </a>
      </section>

      {/* Séparateur */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
      </div>

      {/* Grille articles */}
      <section id="collection" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <p
          className="text-xs tracking-widest uppercase mb-10 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          {articles.length} pièce{articles.length !== 1 ? 's' : ''} disponible{articles.length !== 1 ? 's' : ''}
        </p>

        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p
              className="font-serif text-xl mb-3"
              style={{ color: 'var(--text-muted)' }}
            >
              Aucune pièce disponible pour le moment
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Revenez bientôt — de nouvelles pièces arrivent régulièrement.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                delay={i * 80}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Vérifier visuellement**

```bash
# http://localhost:3001
# — Si AMLuxe tourne sur :3000 et a des articles "En vente" → ils apparaissent
# — Sinon : "Aucune pièce disponible" s'affiche correctement
# — Vérifier : dark mode toggle bascule les couleurs, animation fade-up au scroll
```

- [ ] **Commit**

```bash
cd E:/amluxe-boutique
git add app/page.tsx
git commit -m "feat: page d'accueil avec hero + grille articles ISR 60s"
```

---

### Task 12 : Composant PhotoGallery

**Fichiers :**
- Créer : `E:/amluxe-boutique/components/PhotoGallery.tsx`

- [ ] **Créer le composant**

```tsx
// E:/amluxe-boutique/components/PhotoGallery.tsx
'use client'

import Image from 'next/image'
import { useState } from 'react'

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [selected, setSelected] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  if (photos.length === 0) {
    return (
      <div
        className="aspect-square rounded-sm flex items-center justify-center"
        style={{ backgroundColor: 'var(--border)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
    )
  }

  return (
    <>
      {/* Photo principale */}
      <div
        className="aspect-square relative rounded-sm overflow-hidden cursor-zoom-in"
        style={{ backgroundColor: 'var(--border)' }}
        onClick={() => setLightbox(true)}
      >
        <Image
          src={photos[selected]}
          alt={alt}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 640px) 100vw, 50vw"
          priority
        />
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {selected + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Miniatures */}
      {photos.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative shrink-0 w-16 h-16 rounded-sm overflow-hidden border-2 transition-all ${
                i === selected ? 'opacity-100' : 'opacity-50 hover:opacity-75'
              }`}
              style={{ borderColor: i === selected ? 'var(--accent)' : 'transparent' }}
            >
              <Image
                src={photo}
                alt={`${alt} ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full h-full mx-4">
            <Image
              src={photos[selected]}
              alt={alt}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
            onClick={() => setLightbox(false)}
            aria-label="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
```

- [ ] **Commit**

```bash
cd E:/amluxe-boutique
git add components/PhotoGallery.tsx
git commit -m "feat: PhotoGallery avec miniatures et lightbox"
```

---

### Task 13 : Page fiche produit /sacs/[id]

**Fichiers :**
- Créer : `E:/amluxe-boutique/app/sacs/[id]/page.tsx`

- [ ] **Créer la page**

```tsx
// E:/amluxe-boutique/app/sacs/[id]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getArticle, getArticles } from '@/lib/articles'
import { PhotoGallery } from '@/components/PhotoGallery'
import { BuyButton } from '@/components/BuyButton'

export const revalidate = 60

export async function generateStaticParams() {
  const articles = await getArticles()
  return articles.map((a) => ({ id: String(a.id) }))
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const article = await getArticle(parseInt(params.id))
  if (!article) return { title: 'Article non disponible' }
  return {
    title: `${article.marque} ${article.modele} — La Boutique`,
    description: `${article.etat} · ${article.prixVente?.toLocaleString('fr-FR')} €`,
  }
}

const ETAT_COLORS: Record<string, string> = {
  'Neuf':          '#22c55e',
  'Très bon état': '#84cc16',
  'Bon état':      '#eab308',
  'État correct':  '#f97316',
}

export default async function FicheProduit({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const article = await getArticle(id)
  if (!article) notFound()

  const etatColor = ETAT_COLORS[article.etat] ?? 'var(--text-muted)'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Retour */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase mb-10 transition-opacity hover:opacity-60"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Collection
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* Galerie */}
        <div>
          <PhotoGallery photos={article.photos} alt={`${article.marque} ${article.modele}`} />
        </div>

        {/* Infos */}
        <div className="flex flex-col">
          <p
            className="text-xs tracking-widest uppercase mb-3"
            style={{ color: 'var(--accent)' }}
          >
            {article.marque}
          </p>
          <h1
            className="font-serif text-3xl sm:text-4xl mb-6"
            style={{ color: 'var(--text)' }}
          >
            {article.modele}
          </h1>

          {/* Prix */}
          <p
            className="font-serif text-2xl mb-6"
            style={{ color: 'var(--text)' }}
          >
            {article.prixVente?.toLocaleString('fr-FR')} €
          </p>

          {/* État */}
          <div
            className="inline-flex items-center gap-2 text-xs tracking-wider uppercase px-3 py-1.5 rounded-sm mb-6 self-start border"
            style={{ borderColor: etatColor, color: etatColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: etatColor }} />
            {article.etat}
          </div>

          {/* Notes / description */}
          {article.notes && (
            <p
              className="text-sm leading-relaxed mb-8"
              style={{ color: 'var(--text-muted)' }}
            >
              {article.notes}
            </p>
          )}

          <div className="border-t pt-8 mt-auto" style={{ borderColor: 'var(--border)' }}>
            {/* Bouton achat — composant client séparé */}
            <BuyButton articleId={article.id} prix={article.prixVente ?? 0} />

            <p
              className="text-xs text-center mt-4"
              style={{ color: 'var(--text-muted)' }}
            >
              Paiement 100% sécurisé via Stripe · Livraison assurée
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

> **Note :** La page référence `BuyButton` qui sera créé dans la Task suivante.

- [ ] **Ne pas commit encore — attendre Task 14 (BuyButton doit exister avant que le build passe)**

---

### Task 14 : Route POST /api/checkout + BuyButton

**Fichiers :**
- Créer : `E:/amluxe-boutique/app/api/checkout/route.ts`
- Créer : `E:/amluxe-boutique/components/BuyButton.tsx`

- [ ] **Créer la route /api/checkout**

```ts
// E:/amluxe-boutique/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getArticle } from '@/lib/articles'

const BOUTIQUE_URL = process.env.NEXT_PUBLIC_BOUTIQUE_URL ?? 'http://localhost:3001'

export async function POST(req: NextRequest) {
  const { articleId } = await req.json()

  if (!articleId || typeof articleId !== 'number') {
    return NextResponse.json({ error: 'articleId requis' }, { status: 400 })
  }

  // Vérifier que l'article est toujours disponible
  const article = await getArticle(articleId)
  if (!article) {
    return NextResponse.json(
      { error: 'Ce sac n\'est plus disponible.' },
      { status: 409 }
    )
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(article.prixVente * 100),
          product_data: {
            name: `${article.marque} ${article.modele}`,
            description: article.etat,
            images: article.photos.slice(0, 1),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      articleId: String(articleId),
    },
    success_url: `${BOUTIQUE_URL}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BOUTIQUE_URL}/annulation`,
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Ajouter `NEXT_PUBLIC_BOUTIQUE_URL` dans `.env.local`**

```bash
# Ajouter dans E:/amluxe-boutique/.env.local :
NEXT_PUBLIC_BOUTIQUE_URL=http://localhost:3001
```

- [ ] **Créer BuyButton.tsx**

```tsx
// E:/amluxe-boutique/components/BuyButton.tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export function BuyButton({ articleId, prix }: { articleId: number; prix: number }) {
  const [loading, setLoading] = useState(false)

  const handleBuy = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Une erreur est survenue')
        return
      }

      // Redirection vers Stripe Checkout
      window.location.href = data.url
    } catch {
      toast.error('Impossible de lancer le paiement. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="w-full py-4 text-sm tracking-widest uppercase transition-all duration-300 disabled:opacity-50"
      style={{
        backgroundColor: 'var(--accent)',
        color: '#ffffff',
      }}
    >
      {loading ? 'Chargement…' : `Acheter ce sac — ${prix.toLocaleString('fr-FR')} €`}
    </button>
  )
}
```

- [ ] **Tester le flux complet en mode test Stripe**

```bash
# AMLuxe doit tourner sur :3000, boutique sur :3001
# 1. Aller sur http://localhost:3001
# 2. Cliquer sur un article "En vente"
# 3. Cliquer "Acheter ce sac"
# 4. → Redirection vers page Stripe (test mode)
# 5. Utiliser la carte test : 4242 4242 4242 4242, exp: 12/26, CVC: 123
# 6. → Redirection vers /confirmation
```

- [ ] **Commit (inclut aussi app/sacs/[id]/page.tsx de la Task précédente)**

```bash
cd E:/amluxe-boutique
git add app/sacs/[id]/page.tsx app/api/checkout/route.ts components/BuyButton.tsx .env.local
git commit -m "feat: fiche produit + route /api/checkout Stripe + BuyButton"
```

---

### Task 15 : Pages confirmation + annulation + à propos

**Fichiers :**
- Créer : `E:/amluxe-boutique/app/confirmation/page.tsx`
- Créer : `E:/amluxe-boutique/app/annulation/page.tsx`
- Créer : `E:/amluxe-boutique/app/a-propos/page.tsx`

- [ ] **Créer app/confirmation/page.tsx**

```tsx
// E:/amluxe-boutique/app/confirmation/page.tsx
import { Suspense } from 'react'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'

async function ConfirmationContent({ sessionId }: { sessionId: string }) {
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Impossible de récupérer les détails de ta commande.
      </p>
    )
  }

  const montant = session.amount_total ? (session.amount_total / 100).toLocaleString('fr-FR') : '—'

  return (
    <div className="text-center space-y-4">
      <div
        className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--border)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#22c55e' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="font-serif text-3xl" style={{ color: 'var(--text)' }}>
        Merci pour ton achat
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Paiement de <strong>{montant} €</strong> confirmé.
      </p>
      <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
        Tu vas recevoir un email de confirmation Stripe. Nous te contacterons sous 24h pour organiser la livraison.
      </p>
    </div>
  )
}

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id

  return (
    <div className="max-w-lg mx-auto px-4 py-24">
      {!sessionId ? (
        <p style={{ color: 'var(--text-muted)' }}>Session introuvable.</p>
      ) : (
        <Suspense fallback={<p style={{ color: 'var(--text-muted)' }}>Vérification…</p>}>
          <ConfirmationContent sessionId={sessionId} />
        </Suspense>
      )}
      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-xs tracking-widest uppercase border-b pb-0.5 transition-opacity hover:opacity-60"
          style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          Retour à la collection
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Créer app/annulation/page.tsx**

```tsx
// E:/amluxe-boutique/app/annulation/page.tsx
import Link from 'next/link'

export default function AnnulationPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div
        className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: 'var(--border)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="font-serif text-3xl mb-4" style={{ color: 'var(--text)' }}>
        Paiement annulé
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
        Tu as annulé le paiement. Le sac est toujours disponible si tu changes d&apos;avis.
      </p>
      <Link
        href="/"
        className="inline-block border px-8 py-3 text-xs tracking-widest uppercase transition-all hover:opacity-70"
        style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
      >
        Retour à la collection
      </Link>
    </div>
  )
}
```

- [ ] **Créer app/a-propos/page.tsx**

```tsx
// E:/amluxe-boutique/app/a-propos/page.tsx
export default function AProposPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
      <p className="text-xs tracking-widest uppercase mb-6" style={{ color: 'var(--accent)' }}>
        À propos
      </p>
      <h1 className="font-serif text-4xl mb-10" style={{ color: 'var(--text)' }}>
        Notre histoire
      </h1>
      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        <p>
          {/* À personnaliser */}
          Passionné(e) par les sacs de luxe, je sélectionne des pièces d&apos;exception auprès de fournisseurs de confiance pour vous les proposer à des prix justes.
        </p>
        <p>
          Chaque pièce est minutieusement inspectée et son authenticité vérifiée avant d&apos;être mise en vente. Hermès, Chanel, Louis Vuitton, Dior — uniquement des maisons reconnues.
        </p>
        <p>
          La livraison est organisée personnellement et assurée. Pour toute question, contactez-nous directement.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
cd E:/amluxe-boutique
git add app/confirmation/page.tsx app/annulation/page.tsx app/a-propos/page.tsx
git commit -m "feat: pages confirmation + annulation + a-propos"
```

---

### Task 16 : Dockerfile + .env.example + .gitignore

**Fichiers :**
- Créer : `E:/amluxe-boutique/Dockerfile`
- Créer : `E:/amluxe-boutique/.env.example`
- Créer : `E:/amluxe-boutique/.gitignore`

- [ ] **Créer le Dockerfile**

```dockerfile
# E:/amluxe-boutique/Dockerfile
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Créer .env.example**

```bash
# E:/amluxe-boutique/.env.example
NEXT_PUBLIC_AMLUXE_API_URL=https://amluxe-production.up.railway.app
NEXT_PUBLIC_BOUTIQUE_URL=https://ma-boutique.up.railway.app
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- [ ] **Créer .gitignore**

```bash
# E:/amluxe-boutique/.gitignore
node_modules/
.next/
.env*.local
.env
*.log
.DS_Store
```

- [ ] **Vérifier le build local**

```bash
cd E:/amluxe-boutique
npm run build
# Attendu : "✓ Compiled successfully" sans erreurs TypeScript
```

- [ ] **Commit final**

```bash
cd E:/amluxe-boutique
git add Dockerfile .env.example .gitignore
git commit -m "feat: Dockerfile + .env.example pour déploiement Railway"
```

---

### Task 17 : Déploiement Railway + Webhook Stripe

- [ ] **Créer un repo GitHub pour la boutique**

```bash
# Sur github.com → New repository → "amluxe-boutique" (public ou private)
cd E:/amluxe-boutique
git remote add origin https://github.com/<ton-username>/amluxe-boutique.git
git push -u origin main
```

- [ ] **Créer un nouveau service Railway**

```
1. Ouvrir railway.app → ton projet AMLuxe existant
2. "+ New Service" → "GitHub Repo" → sélectionner "amluxe-boutique"
3. Railway détecte le Dockerfile automatiquement
```

- [ ] **Configurer les variables d'environnement Railway**

```
Dans le service boutique sur Railway → Variables :

NEXT_PUBLIC_AMLUXE_API_URL   = https://amluxe-production.up.railway.app
NEXT_PUBLIC_BOUTIQUE_URL     = https://ma-boutique.up.railway.app
STRIPE_SECRET_KEY            = sk_live_...   ← Depuis dashboard.stripe.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_WEBHOOK_SECRET        = (à compléter après l'étape suivante)
```

- [ ] **Générer le domaine Railway**

```
Service boutique → Settings → Networking → Generate Domain
→ Copier le domaine généré (ex: ma-boutique.up.railway.app)
→ Mettre à jour NEXT_PUBLIC_BOUTIQUE_URL avec ce domaine exact
```

- [ ] **Configurer le webhook Stripe**

```
1. dashboard.stripe.com → Developers → Webhooks → "+ Add endpoint"
2. Endpoint URL : https://amluxe-production.up.railway.app/api/webhooks/stripe
3. Events to listen : checkout.session.completed
4. → Copier le "Signing secret" (whsec_...)
5. Mettre à jour STRIPE_WEBHOOK_SECRET dans Railway (côté AMLuxe, pas boutique)
```

> **Important :** Le webhook pointe vers AMLuxe (pas vers la boutique) car c'est AMLuxe qui marque l'article "Vendu" en DB.

- [ ] **Ajouter STRIPE_WEBHOOK_SECRET dans AMLuxe Railway**

```
Service AMLuxe sur Railway → Variables :
STRIPE_WEBHOOK_SECRET = whsec_... (le secret Stripe copié ci-dessus)
```

- [ ] **Tester le flux complet en production**

```
1. Dans AMLuxe admin → mettre un article en "En vente"
2. Attendre ~60s → ouvrir https://ma-boutique.up.railway.app
3. L'article doit apparaître
4. Cliquer sur l'article → "Acheter"
5. Page Stripe → carte test : 4242 4242 4242 4242 / 12/26 / 123
6. → Redirection /confirmation
7. Dans AMLuxe admin → l'article doit être passé "Vendu" automatiquement
```

- [ ] **Push AMLuxe develop → production**

```bash
cd E:/AMLuxe
git checkout main
git merge develop
git push origin main
git checkout develop
```

---

## Récapitulatif des variables d'environnement

### AMLuxe (Railway)
| Variable | Valeur |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (depuis Stripe Dashboard) |

### Boutique (Railway)
| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_AMLUXE_API_URL` | `https://amluxe-production.up.railway.app` |
| `NEXT_PUBLIC_BOUTIQUE_URL` | `https://ma-boutique.up.railway.app` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

---

## Checklist finale

- [ ] Routes publiques AMLuxe accessibles sans auth
- [ ] Webhook Stripe valide et signé (test avec Stripe CLI : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- [ ] Dark mode bascule correctement (crème ↔ noir)
- [ ] Article "En vente" → visible boutique en < 60s
- [ ] Achat Stripe → article "Vendu" dans AMLuxe automatiquement
- [ ] Double vente impossible (vérification statut avant création session)
- [ ] `prefers-reduced-motion` désactive les animations
- [ ] Build Railway sans erreur sur les deux services
