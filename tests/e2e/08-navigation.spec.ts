/**
 * 08-navigation.spec.ts
 * Tests de navigation : tous les liens sidebar, breadcrumbs, titres de pages,
 * sidebar collapsible, pages sans contenu (objectifs, abonnements), page export.
 */
import { test, expect } from '@playwright/test'

test.describe('Navigation sidebar', () => {
  const pages = [
    { label: 'Dashboard', href: '/', heading: /dashboard|tableau de bord/i },
    { label: 'Commandes', href: '/commandes', heading: /commandes fournisseurs/i },
    { label: 'Articles', href: '/articles', heading: /articles/i },
    { label: 'Statistiques', href: '/statistiques', heading: /statistiques/i },
    { label: 'Export', href: '/export', heading: /export/i },
    { label: 'Utilisateurs', href: '/parametres/utilisateurs', heading: /utilisateurs/i },
  ]

  for (const { label, href, heading } of pages) {
    test(`lien "${label}" navigue vers ${href}`, async ({ page }) => {
      await page.goto('/commandes') // Point de départ
      await page.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(href, { timeout: 8000 })
      await page.waitForLoadState('domcontentloaded')
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 10000 })
    })
  }

  test('lien "Objectifs" navigue vers /objectifs', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Objectifs', exact: true }).click()
    await expect(page).toHaveURL('/objectifs', { timeout: 8000 })
    // La page est vide mais ne doit pas crasher
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('.login-error, [data-error]')).not.toBeVisible()
  })

  test('lien "Abonnements" navigue vers /parametres/abonnements', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Abonnements', exact: true }).click()
    await expect(page).toHaveURL('/parametres/abonnements', { timeout: 8000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('.login-error, [data-error]')).not.toBeVisible()
  })
})

test.describe('État actif de la sidebar', () => {
  test('le lien actif est surligné sur /commandes', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    const commandesLink = page.getByRole('link', { name: 'Commandes', exact: true })
    // Le lien actif a la classe bg-purple-600/20 ou similaire
    await expect(commandesLink).toHaveClass(/purple/, { timeout: 5000 })
  })

  test('le lien actif est surligné sur /articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    const articlesLink = page.getByRole('link', { name: 'Articles', exact: true })
    await expect(articlesLink).toHaveClass(/purple/, { timeout: 5000 })
  })
})

test.describe('Sidebar collapsible (desktop)', () => {
  test('bouton collapse réduit la sidebar', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')

    const btnCollapse = page.getByRole('button', { name: 'Réduire la sidebar' })
    await expect(btnCollapse).toBeVisible()
    await btnCollapse.click()

    // En mode réduit, le label texte "Commandes" n'est plus rendu (seulement l'icône + title tooltip)
    const desktopSidebar = page.locator('div.hidden.lg\\:flex')
    await expect(desktopSidebar.getByText('Commandes', { exact: true })).not.toBeVisible({ timeout: 3000 })

    // Étendre à nouveau
    const btnExpand = page.getByRole('button', { name: 'Étendre la sidebar' })
    await btnExpand.click()
    await expect(desktopSidebar.getByText('Commandes', { exact: true })).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Breadcrumb et retour', () => {
  test('la page commande détail a un breadcrumb "Commandes > fournisseur"', async ({ page }) => {
    // Aller sur la liste et cliquer la première commande
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')

    const premiereLigne = page.locator('tr').nth(1) // 1ère ligne après le header
    if (await premiereLigne.isVisible()) {
      await premiereLigne.click()
      await expect(page).toHaveURL(/\/commandes\/\d+/, { timeout: 8000 })
      await page.waitForLoadState('domcontentloaded')
      // Breadcrumb "Commandes" visible
      await expect(page.getByRole('link', { name: 'Commandes' })).toBeVisible()
    }
  })
})

test.describe('Pages publiques', () => {
  test('/login accessible sans authentification', async ({ page }) => {
    // Reset auth
    await page.context().clearCookies()
    await page.goto('/login')
    await expect(page.locator('h1.login-brand')).toHaveText('AMLuxe')
  })
})

test.describe('Responsive — mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone SE

  test('la sidebar est masquée sur mobile au chargement', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    // Sur mobile, le drawer est fermé : classe -translate-x-full (hors-viewport)
    // Note: Playwright ne considère pas translateX comme "hidden" — vérifier la classe CSS
    const mobileDrawer = page.locator('div.lg\\:hidden.fixed.inset-y-0')
    await expect(mobileDrawer).toHaveClass(/-translate-x-full/)
  })

  test('le bouton menu ouvre le drawer sur mobile', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')

    // Bouton hamburger avec aria-label="Menu" dans la barre mobile
    const btnMenu = page.locator('button[aria-label="Menu"]')
    if (await btnMenu.isVisible()) {
      await btnMenu.click()
      // Drawer ouvert → liens visibles
      await expect(page.getByRole('link', { name: 'Commandes', exact: true })).toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Page Export', () => {
  test('page export se charge correctement', async ({ page }) => {
    await page.goto('/export')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /export/i }).first()).toBeVisible({ timeout: 8000 })
  })

  test('bouton d\'export est présent et cliquable', async ({ page }) => {
    await page.goto('/export')
    await page.waitForLoadState('domcontentloaded')
    const exportBtn = page.getByRole('button', { name: /exporter|télécharger/i }).first()
    await expect(exportBtn).toBeVisible({ timeout: 8000 })
  })
})
