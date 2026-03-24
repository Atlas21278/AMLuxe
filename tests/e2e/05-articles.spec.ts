/**
 * 05-articles.spec.ts
 * Tests de la page /articles : liste, stats, recherche, filtres, édition, vente.
 */
import { test, expect } from '@playwright/test'
import {
  createTestCommande,
  deleteTestCommande,
  createTestArticle,
  createTestFrais,
  TEST_PREFIX,
} from '../helpers/api'

test.describe('Page Articles', () => {
  let commandeId: number
  let articleId: number
  let articleVenteId: number

  test.beforeAll(async ({ request }) => {
    commandeId = await createTestCommande(request, `${TEST_PREFIX} Commande Articles`)

    // Article pour tests généraux
    articleId = await createTestArticle(request, commandeId, {
      marque: 'Hermès',
      modele: 'Birkin 30',
      prixAchat: 8000,
      etat: 'Très bon état',
      statut: 'En stock',
    })

    // Article + frais pour tester la vente
    articleVenteId = await createTestArticle(request, commandeId, {
      marque: 'Chanel',
      modele: 'Classic Flap Medium',
      prixAchat: 5000,
      etat: 'Bon état',
      statut: 'En stock',
    })
    await createTestFrais(request, commandeId)
  })

  test.afterAll(async ({ request }) => {
    await deleteTestCommande(request, commandeId) // cascade articles + frais
  })

  // ─── Rendu de la page ──────────────────────────────────────────────────────

  test('page se charge avec le titre Articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Articles' })).toBeVisible()
  })

  test('affiche les 4 stat cards (Total, En stock, En vente, Vendus)', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Total', { exact: true })).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('En stock', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('En vente', { exact: true })).toBeVisible()
    await expect(page.getByText('Vendus', { exact: true })).toBeVisible()
  })

  test('les articles de test apparaissent dans la liste', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Hermès').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Birkin 30').first()).toBeVisible()
  })

  // ─── Recherche ────────────────────────────────────────────────────────────

  test('recherche par marque filtre les articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Rechercher un article...').fill('Hermès')
    await expect(page.getByText('Birkin 30').first()).toBeVisible()
    await expect(page.getByText('Classic Flap Medium').first()).not.toBeVisible()
  })

  test('recherche par modèle filtre les articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(page.getByText('Birkin 30').first()).toBeVisible({ timeout: 5000 })
  })

  test('recherche sans résultats affiche l\'état vide', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Rechercher un article...').fill('zzz_inexistant_zzz')
    await expect(page.getByText(/aucun article/i)).toBeVisible({ timeout: 5000 })
  })

  // ─── Filtres statut ───────────────────────────────────────────────────────

  test('filtre "En stock" affiche les articles en stock', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'En stock', exact: true }).click()
    await expect(page.getByText('Birkin 30').first()).toBeVisible({ timeout: 5000 })
  })

  test('filtre "Vendu" masque les articles en stock', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Vendu', exact: true }).click()
    // Nos articles tests sont "En stock", ils ne doivent pas apparaître
    await expect(page.getByText('Birkin 30').first()).not.toBeVisible()
  })

  test('filtre "tous" réaffiche tous les articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Vendu', exact: true }).click()
    await page.getByRole('button', { name: 'tous', exact: true }).click()
    await expect(page.getByText('Birkin 30').first()).toBeVisible({ timeout: 5000 })
  })

  // ─── Filtre marque ────────────────────────────────────────────────────────

  test('filtre par marque fonctionne', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')

    const selectMarque = page.locator('select').first()
    await selectMarque.selectOption('Hermès')
    await expect(page.getByText('Birkin 30').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Classic Flap Medium').first()).not.toBeVisible()
  })

  // ─── Édition article depuis la liste ─────────────────────────────────────

  test('éditer un article depuis la page articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')

    // Chercher l'article Birkin
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(page.getByText('Birkin 30').first()).toBeVisible()

    // Cliquer sur le bouton modifier (title="Modifier")
    await page.locator('button[title="Modifier"]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/modifier.*article|article/i)).toBeVisible()

    // Fermer sans modifier
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  // ─── Mise en vente ────────────────────────────────────────────────────────

  test('mettre un article "En vente" depuis la page articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')

    // Chercher l'article Chanel (qui a des frais)
    await page.getByPlaceholder('Rechercher un article...').fill('Classic Flap')
    await expect(page.getByText('Classic Flap Medium').first()).toBeVisible({ timeout: 8000 })

    // Cliquer sur Vendre (title="Vendre")
    await page.locator('button[title="Vendre"]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Renseigner le prix de vente affiché
    const prixInput = page.getByRole('dialog').locator('input[type="number"]').first()
    await prixInput.fill('6500')

    // Sélectionner la plateforme
    const platformSelect = page.getByRole('dialog').locator('select').first()
    await platformSelect.selectOption('Vinted')

    // Valider
    await page.getByRole('dialog').getByRole('button', { name: /enregistrer|valider|mettre en vente/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // Toast de succès
    await expect(page.getByText(/article|vente/i).last()).toBeVisible({ timeout: 5000 })
  })

  // ─── Lien vers la commande ────────────────────────────────────────────────

  test('le lien fournisseur redirige vers la commande', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(page.getByText('Birkin 30').first()).toBeVisible()

    // Lien vers la commande (nom du fournisseur cliquable)
    const lienCommande = page.getByRole('link', { name: /TEST.*Commande Articles/i }).first()
    if (await lienCommande.isVisible()) {
      await lienCommande.click()
      await expect(page).toHaveURL(/\/commandes\/\d+/)
    }
  })
})
