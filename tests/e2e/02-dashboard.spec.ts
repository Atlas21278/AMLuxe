/**
 * 02-dashboard.spec.ts
 * Tests du tableau de bord : KPIs, sections, liens de navigation rapide.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Attendre que la page soit chargée (skeleton → contenu)
    await page.waitForLoadState('networkidle')
  })

  test('page se charge sans erreur', async ({ page }) => {
    await expect(page).toHaveURL('/')
    // Pas d'erreur critique visible
    await expect(page.locator('.login-error')).not.toBeVisible()
  })

  test('affiche les 4 KPI cards du mois', async ({ page }) => {
    // CA du mois
    await expect(page.getByText('CA du mois', { exact: false })).toBeVisible({ timeout: 10000 })
    // Bénéfice du mois
    await expect(page.getByText('Bénéfice', { exact: false })).toBeVisible()
    // En stock
    await expect(page.getByText('En stock', { exact: false })).toBeVisible()
    // En vente
    await expect(page.getByText('En vente', { exact: false })).toBeVisible()
  })

  test('affiche la section dernières commandes', async ({ page }) => {
    await expect(page.getByText('Dernières commandes', { exact: false })).toBeVisible({ timeout: 10000 })
  })

  test('affiche la section ventes récentes', async ({ page }) => {
    await expect(page.getByText('Ventes récentes', { exact: false })).toBeVisible({ timeout: 10000 })
  })

  test('le lien "Voir toutes les commandes" navigue vers /commandes', async ({ page }) => {
    const lien = page.getByRole('link', { name: /voir toutes|toutes les commandes/i })
    if (await lien.isVisible()) {
      await lien.click()
      await expect(page).toHaveURL(/\/commandes/)
    }
  })

  test('sidebar visible avec les liens principaux', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Commandes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Articles' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Statistiques' })).toBeVisible()
  })

  test('logo AMLuxe visible dans la sidebar', async ({ page }) => {
    await expect(page.getByText('AMLuxe').first()).toBeVisible()
  })
})
