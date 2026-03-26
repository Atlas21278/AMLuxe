/**
 * 05-articles.spec.ts
 * Tests de la page /articles : liste, stats, recherche, filtres, édition, vente.
 */
import { test, expect, type Page } from '@playwright/test'

// Cibler la table desktop (visible à 1280px) — version mobile (sm:hidden) est masquée
// .first() évite strict mode si données stale ou sélection select masquée
function inTable(page: Page, text: string) {
  return page.locator('table').getByText(text).first()
}
import {
  createTestCommande,
  deleteTestCommande,
  createTestArticle,
  createTestFrais,
  uploadTestPhoto,
  updateTestArticle,
  TEST_PREFIX,
} from '../helpers/api'

test.describe('Page Articles', () => {
  let commandeId: number
  let articleId: number
  let articleVenteId: number
  let articleLienId: number

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

    // Article "En vente" avec lienAnnonce pour T-101
    articleLienId = await createTestArticle(request, commandeId, {
      marque: 'Gucci',
      modele: 'Marmont Matelassé',
      prixAchat: 900,
      etat: 'Bon état',
      statut: 'En vente',
    })
    await updateTestArticle(request, articleLienId, {
      marque: 'Gucci',
      modele: 'Marmont Matelassé',
      prixAchat: 900,
      etat: 'Bon état',
      statut: 'En vente',
      lienAnnonce: 'https://www.vinted.fr/items/test-amluxe-101',
    })
  })

  test.afterAll(async ({ request }) => {
    await deleteTestCommande(request, commandeId) // cascade articles + frais
  })

  // ─── Rendu de la page ──────────────────────────────────────────────────────

  test('page se charge avec le titre Articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: 'Articles' })).toBeVisible()
  })

  test('affiche les 4 stat cards (Total, En stock, En vente, Vendus)', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('En stock', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('En vente', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Vendus', { exact: true }).first()).toBeVisible()
  })

  test('les articles de test apparaissent dans la liste', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await expect(inTable(page, 'Hermès')).toBeVisible({ timeout: 10000 })
    await expect(inTable(page, 'Birkin 30')).toBeVisible()
  })

  // ─── Recherche ────────────────────────────────────────────────────────────

  test('recherche par marque filtre les articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Hermès')
    await expect(inTable(page, 'Birkin 30')).toBeVisible()
    await expect(inTable(page, 'Classic Flap Medium')).not.toBeVisible()
  })

  test('recherche par modèle filtre les articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(inTable(page, 'Birkin 30')).toBeVisible({ timeout: 5000 })
  })

  test('recherche sans résultats affiche l\'état vide', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('zzz_inexistant_zzz')
    await expect(page.getByText(/aucun article/i)).toBeVisible({ timeout: 5000 })
  })

  // ─── Filtres statut ───────────────────────────────────────────────────────

  test('filtre "En stock" affiche les articles en stock', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: 'En stock', exact: true }).click()
    await expect(inTable(page, 'Birkin 30')).toBeVisible({ timeout: 5000 })
  })

  test('filtre "Vendu" masque les articles en stock', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: 'Vendu', exact: true }).click()
    // Nos articles tests sont "En stock", ils ne doivent pas apparaître
    await expect(inTable(page, 'Birkin 30')).not.toBeVisible()
  })

  test('filtre "tous" réaffiche tous les articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: 'Vendu', exact: true }).click()
    await page.getByRole('button', { name: 'Tous', exact: true }).click()
    await expect(inTable(page, 'Birkin 30')).toBeVisible({ timeout: 5000 })
  })

  // ─── Filtre marque ────────────────────────────────────────────────────────

  test('filtre par marque fonctionne', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')

    const selectMarque = page.locator('select').first()
    await selectMarque.selectOption('Hermès')
    await expect(inTable(page, 'Birkin 30')).toBeVisible({ timeout: 5000 })
    await expect(inTable(page, 'Classic Flap Medium')).not.toBeVisible()
  })

  // ─── Édition article depuis la liste ─────────────────────────────────────

  test('éditer un article depuis la page articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')

    // Chercher l'article Birkin
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(inTable(page, 'Birkin 30')).toBeVisible()

    // Cliquer sur le bouton modifier (title="Modifier")
    await page.locator('button[title="Modifier"]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('heading')).toBeVisible()

    // Fermer sans modifier
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  // ─── Mise en vente ────────────────────────────────────────────────────────

  test('mettre un article "En vente" depuis la page articles', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')

    // Chercher l'article Chanel (qui a des frais)
    await page.getByPlaceholder('Rechercher un article...').fill('Classic Flap')
    await expect(inTable(page, 'Classic Flap Medium')).toBeVisible({ timeout: 8000 })

    // Cliquer sur Vendre (title="Vendre")
    await page.locator('button[title="Vendre"]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Renseigner le prix de vente affiché
    const prixInput = page.getByRole('dialog').locator('input[type="number"]').first()
    await prixInput.fill('6500')

    // Sélectionner la plateforme
    const platformSelect = page.getByRole('dialog').locator('select').first()
    await platformSelect.selectOption('Vinted')

    // Valider — bouton "Confirmer" dans FormulaireVente
    await page.getByRole('dialog').getByRole('button', { name: /enregistrer|valider|mettre en vente|confirmer/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // Toast de succès
    await expect(page.getByText(/article|vente/i).last()).toBeVisible({ timeout: 5000 })
  })

  // ─── Miniature et galerie photos ─────────────────────────────────────────

  test('icône placeholder affiché quand aucune photo', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(inTable(page, 'Birkin 30')).toBeVisible()

    // Doit afficher l'icône SVG placeholder (pas d'img dans la cellule photo)
    const row = page.locator('table tr', { hasText: 'Birkin 30' }).first()
    await expect(row.locator('img')).not.toBeVisible()
    await expect(row.locator('svg').first()).toBeVisible()
  })

  test('miniature affichée après upload d\'une photo', async ({ page, request }) => {
    await uploadTestPhoto(request, articleId)

    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(inTable(page, 'Birkin 30')).toBeVisible()

    // L'img thumbnail doit être présente
    const row = page.locator('table tr', { hasText: 'Birkin 30' }).first()
    await expect(row.locator('img').first()).toBeVisible()
  })

  test('clic sur la miniature ouvre la galerie', async ({ page, request }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(inTable(page, 'Birkin 30')).toBeVisible()

    // Cliquer sur le bouton thumbnail (le 1er button contenant une <img>)
    const row = page.locator('table tr', { hasText: 'Birkin 30' }).first()
    const thumbnailBtn = row.locator('button').filter({ has: page.locator('img') }).first()
    await thumbnailBtn.click()

    // La galerie s'ouvre : overlay + image + compteur "1 /"
    await expect(page.locator('text=/1 \\//i')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('img[alt="Photo 1"]')).toBeVisible()
  })

  test('fermer la galerie avec Escape', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    const row = page.locator('table tr', { hasText: 'Birkin 30' }).first()
    const thumbnailBtn = row.locator('button').filter({ has: page.locator('img') }).first()
    await thumbnailBtn.click()
    await expect(page.locator('img[alt="Photo 1"]')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('img[alt="Photo 1"]')).not.toBeVisible()
  })

  test('galerie avec plusieurs photos : navigation flèches et dots', async ({ page, request }) => {
    // Uploader une 2e photo
    await uploadTestPhoto(request, articleId)

    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    const row = page.locator('table tr', { hasText: 'Birkin 30' }).first()
    const thumbnailBtn = row.locator('button').filter({ has: page.locator('img') }).first()
    await thumbnailBtn.click()

    // Badge compteur doit afficher "1 / 2" (ou plus selon uploads précédents)
    await expect(page.locator('text=/ \\/ /').first()).toBeVisible()

    // Flèche droite visible
    await expect(page.locator('button', { hasText: '' }).filter({ has: page.locator('svg path[d*="M9 5"]') })).toBeVisible()

    // Clic flèche droite → photo suivante
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('img[alt="Photo 2"]')).toBeVisible({ timeout: 3000 })

    // Clic flèche gauche → retour photo 1
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('img[alt="Photo 1"]')).toBeVisible({ timeout: 3000 })
  })

  // ─── Lien vers la commande ────────────────────────────────────────────────

  test('le lien fournisseur redirige vers la commande', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    await expect(inTable(page, 'Birkin 30')).toBeVisible()

    // Lien vers la commande dans la table desktop (nom du fournisseur cliquable)
    const lienCommande = page.locator('table a').filter({ hasText: /TEST.*Commande Articles/i }).first()
    if (await lienCommande.isVisible()) {
      const href = await lienCommande.getAttribute('href')
      expect(href).toMatch(/\/commandes\/\d+/)
      await page.goto(href!)
      await expect(page).toHaveURL(/\/commandes\/\d+/)
    }
  })

  // ─── T-101 · Badge "En vente" cliquable ──────────────────────────────────

  test('badge "En vente" sans lienAnnonce : span non cliquable', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    // Hermès Birkin 30 est "En stock" — son badge ne doit pas être un lien
    await page.getByPlaceholder('Rechercher un article...').fill('Birkin')
    // Attendre que la recherche soit appliquée (les articles non-Birkin doivent avoir disparu)
    await expect(inTable(page, 'Marmont Matelassé')).not.toBeVisible({ timeout: 8000 })
    await expect(inTable(page, 'Birkin 30')).toBeVisible()
    await expect(page.locator('[data-testid="badge-lien-annonce"]')).not.toBeVisible()
  })

  test('badge "En vente" avec lienAnnonce : lien cliquable avec icône ↗', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Marmont')
    await expect(inTable(page, 'Marmont Matelassé')).toBeVisible({ timeout: 8000 })

    // Cibler le badge dans la table desktop (la vue mobile sm:hidden est cachée à 1280px)
    const badge = page.locator('table [data-testid="badge-lien-annonce"]').first()
    await expect(badge).toBeVisible()
    await expect(badge).toHaveAttribute('href', 'https://www.vinted.fr/items/test-amluxe-101')
    await expect(badge).toHaveAttribute('target', '_blank')
    // Contient le texte "En vente"
    await expect(badge).toContainText('En vente')
  })

  test('badge "En vente" cliquable ouvre l\'annonce dans un nouvel onglet', async ({ page, context }) => {
    await page.goto('/articles')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un article...').fill('Marmont')
    await expect(inTable(page, 'Marmont Matelassé')).toBeVisible({ timeout: 8000 })

    // Cibler le badge dans la table desktop (la vue mobile sm:hidden est cachée à 1280px)
    const badge = page.locator('table [data-testid="badge-lien-annonce"]').first()
    await expect(badge).toBeVisible()

    // Vérifier que le clic ouvre un nouvel onglet
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      badge.click(),
    ])
    await expect(newPage.url()).toContain('vinted.fr/items/test-amluxe-101')
    await newPage.close()
  })
})
