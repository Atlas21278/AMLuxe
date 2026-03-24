/**
 * 01-auth.spec.ts
 * Tests d'authentification : protection des routes, login, logout.
 * Les tests "unauthenticated" utilisent un contexte vide (sans storageState).
 */
import { test, expect } from '@playwright/test'

// ─── Routes protégées (sans auth) ───────────────────────────────────────────

test.describe('Routes protégées — non authentifié', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const routesProtegees = ['/', '/commandes', '/articles', '/statistiques', '/export', '/parametres/utilisateurs']

  for (const route of routesProtegees) {
    test(`${route} → redirige vers /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    })
  }
})

// ─── Page de login ───────────────────────────────────────────────────────────

test.describe('Page de login', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('affiche le titre AMLuxe et le sous-titre', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1.login-brand')).toHaveText('AMLuxe')
    await expect(page.locator('p.login-subtitle')).toHaveText('Espace Administration')
  })

  test('affiche les champs email et mot de passe', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  })

  test('toggle affichage mot de passe fonctionne', async ({ page }) => {
    await page.goto('/login')
    const passwordInput = page.locator('#password')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Afficher' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Masquer' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('erreur avec identifiants incorrects', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'mauvais@exemple.com')
    await page.fill('#password', 'mauvaismdp')
    await page.click('button[type="submit"]')
    await expect(page.locator('.login-error')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('.login-error')).toContainText('Email ou mot de passe incorrect')
  })

  test('erreur avec bon email et mauvais mot de passe', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'admin@amluxe.fr')
    await page.fill('#password', 'mauvaismdp')
    await page.click('button[type="submit"]')
    await expect(page.locator('.login-error')).toBeVisible({ timeout: 8000 })
  })

  test('connexion réussie → redirige vers /commandes', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'admin@amluxe.fr')
    await page.fill('#password', 'Admin2024!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/commandes/, { timeout: 12000 })
    // La sidebar et le contenu de la page sont visibles
    await expect(page.getByRole('heading', { name: 'Commandes fournisseurs' })).toBeVisible()
  })
})

// ─── Déconnexion ─────────────────────────────────────────────────────────────

test.describe('Déconnexion', () => {
  // Utilise le storageState par défaut (authentifié)

  test('bouton "Se déconnecter" visible dans la sidebar', async ({ page }) => {
    await page.goto('/commandes')
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
  })

  test('déconnexion → redirige vers /login', async ({ page }) => {
    await page.goto('/commandes')
    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('après déconnexion, /commandes redirige vers /login', async ({ page }) => {
    await page.goto('/commandes')
    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    await page.goto('/commandes')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
