/**
 * 06-statistiques.spec.ts
 * Tests de la page /statistiques : KPIs, graphiques, sections par marque/plateforme/fournisseur.
 */
import { test, expect } from '@playwright/test'

test.describe('Page Statistiques', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/statistiques')
    await page.waitForLoadState('domcontentloaded')
  })

  test('page se charge sans erreur', async ({ page }) => {
    await expect(page).toHaveURL('/statistiques')
    await expect(page.getByRole('heading', { name: /statistiques/i })).toBeVisible({ timeout: 10000 })
  })

  test('affiche les KPI cards principales', async ({ page }) => {
    await expect(page.getByText("Chiffre d'affaires", { exact: false }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Bénéfice', { exact: false }).first()).toBeVisible()
  })

  test('affiche la section évolution mensuelle avec un graphique', async ({ page }) => {
    await expect(page.getByText(/évolution|mensuelle/i).first()).toBeVisible({ timeout: 10000 })
    // Recharts rend un SVG
    await expect(page.locator('svg.recharts-surface, .recharts-wrapper').first()).toBeVisible({ timeout: 10000 })
  })

  test('affiche la section par marque', async ({ page }) => {
    await expect(page.getByText(/par marque|top marque/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('affiche la section par fournisseur', async ({ page }) => {
    await expect(page.getByText(/par fournisseur|top fournisseur/i)).toBeVisible({ timeout: 10000 })
  })

  test('affiche la section par plateforme', async ({ page }) => {
    await expect(page.getByText(/par plateforme|top plateforme/i)).toBeVisible({ timeout: 10000 })
  })

  test('affiche les indicateurs de frais', async ({ page }) => {
    await expect(page.getByText(/frais/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('les graphiques Recharts se rendent correctement', async ({ page }) => {
    // Attendre que les graphiques soient chargés (React hydration)
    await page.waitForSelector('.recharts-wrapper, svg.recharts-surface', { timeout: 15000 })
    const charts = page.locator('.recharts-wrapper')
    const count = await charts.count()
    expect(count).toBeGreaterThan(0)
  })

  test('pas d\'erreur JS console critique', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/statistiques')
    await page.waitForLoadState('domcontentloaded')
    // Ignorer les erreurs Recharts connues (hydration warnings)
    const criticalErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('ResizeObserver')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})
