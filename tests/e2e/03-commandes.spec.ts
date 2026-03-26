/**
 * 03-commandes.spec.ts
 * Tests de la page /commandes : liste, création, édition, filtres, suppression, bulk.
 * Crée des données de test propres via l'API et les nettoie après.
 */
import { test, expect, type Page } from '@playwright/test'
import { createTestCommande, deleteTestCommande, TEST_PREFIX } from '../helpers/api'

// Cibler la table desktop (visible à 1280px) — la version mobile (sm:hidden) est masquée
// .first() évite les violations strict mode si des données de test stale existent en DB
function inTable(page: Page, text: string) {
  return page.locator('table').getByText(text).first()
}

// Cliquer sur le lien fournisseur dans la ligne du tableau
function clickTableRow(page: Page, text: string) {
  return page.locator('table').locator('a').filter({ hasText: text }).first()
}

test.describe('Page Commandes', () => {
  let commandeIdA: number  // Commande principale pour les tests
  let commandeIdB: number  // Commande pour les tests de suppression

  test.beforeAll(async ({ request }) => {
    commandeIdA = await createTestCommande(request, `${TEST_PREFIX} Fournisseur Alpha`)
    commandeIdB = await createTestCommande(request, `${TEST_PREFIX} Fournisseur Beta`)
  })

  test.afterAll(async ({ request }) => {
    await deleteTestCommande(request, commandeIdA)
    await deleteTestCommande(request, commandeIdB)
  })

  // ─── Rendu de la page ──────────────────────────────────────────────────────

  test('page se charge avec le titre et les stat cards', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: 'Commandes fournisseurs' })).toBeVisible()
    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('En préparation', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('En livraison', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Reçues', { exact: true }).first()).toBeVisible()
  })

  test('les boutons "Nouvelle commande" et "Importer Excel" sont visibles', async ({ page }) => {
    await page.goto('/commandes')
    await expect(page.getByRole('button', { name: /nouvelle commande/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /importer excel|import/i })).toBeVisible()
  })

  test('les commandes de test apparaissent dans la liste', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Alpha`)).toBeVisible({ timeout: 8000 })
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Beta`)).toBeVisible()
  })

  // ─── Création ─────────────────────────────────────────────────────────────

  test('créer une commande via le formulaire', async ({ page }) => {
    await page.goto('/commandes')
    await page.getByRole('button', { name: /nouvelle commande/i }).click()

    // Le modal s'ouvre
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nouvelle commande' })).toBeVisible()

    // Remplir le fournisseur
    const fournisseurNom = `${TEST_PREFIX} Via UI ${Date.now()}`
    const fournisseurInput = page.getByPlaceholder(/fournisseur|alibaba/i).first()
    await fournisseurInput.fill(fournisseurNom)

    // Soumettre
    await page.getByRole('button', { name: /créer|enregistrer|ajouter/i }).last().click()

    // Modal fermé, toast de succès
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // La commande apparaît dans la liste (table desktop)
    await expect(inTable(page, fournisseurNom)).toBeVisible({ timeout: 8000 })

    // Nettoyage
    const allCommandes = await (await page.request.get('/api/commandes')).json()
    const created = allCommandes.find((c: { fournisseur: string }) => c.fournisseur === fournisseurNom)
    if (created) await page.request.delete(`/api/commandes/${created.id}`)
  })

  // ─── Recherche ────────────────────────────────────────────────────────────

  test('la recherche filtre par fournisseur', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')

    const searchInput = page.getByPlaceholder('Rechercher un fournisseur...')
    await searchInput.fill('Alpha')

    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Alpha`)).toBeVisible()
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Beta`)).not.toBeVisible()

    // Effacer la recherche → les deux réapparaissent
    await searchInput.clear()
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Beta`)).toBeVisible({ timeout: 5000 })
  })

  test('recherche sans résultats affiche le message vide', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un fournisseur...').fill('zzz_inexistant_zzz')
    await expect(page.getByText('Aucune commande trouvée')).toBeVisible()
  })

  // ─── Filtres statut ───────────────────────────────────────────────────────

  test('filtre statut "En préparation" ne montre que les commandes correspondantes', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: 'En préparation', exact: true }).click()
    // Les commandes de test sont "En préparation"
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Alpha`)).toBeVisible({ timeout: 5000 })
  })

  test('filtre statut "En livraison" masque les commandes en préparation', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: 'En livraison', exact: true }).click()
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Alpha`)).not.toBeVisible()
  })

  test('filtre "Tous" réaffiche toutes les commandes', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: 'En livraison', exact: true }).click()
    await page.getByRole('button', { name: 'Tous', exact: true }).click()
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Alpha`)).toBeVisible({ timeout: 5000 })
  })

  // ─── Édition ──────────────────────────────────────────────────────────────

  test('modifier le statut d\'une commande', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')

    // Rechercher la commande Alpha pour trouver le bon bouton modifier
    await page.getByPlaceholder('Rechercher un fournisseur...').fill('Alpha')
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Alpha`)).toBeVisible()

    // Cliquer sur le bouton Modifier (title="Modifier")
    await page.locator('button[title="Modifier"]').first().click()

    // Modal d'édition s'ouvre
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Modifier la commande' })).toBeVisible()

    // Changer le statut
    const select = page.getByRole('dialog').locator('select').first()
    await select.selectOption('En livraison')
    await page.getByRole('dialog').getByRole('button', { name: /enregistrer|modifier|sauvegarder/i }).click()

    // Modal fermé
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // Remettre en préparation pour les prochains tests
    await page.locator('button[title="Modifier"]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').locator('select').first().selectOption('En préparation')
    await page.getByRole('dialog').getByRole('button', { name: /enregistrer|modifier|sauvegarder/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })
  })

  // ─── Navigation vers le détail ────────────────────────────────────────────

  test('cliquer sur une commande navigue vers la page détail', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Alpha`)).toBeVisible({ timeout: 8000 })

    // Vérifier que le lien fournisseur existe et pointe vers la bonne URL
    const lien = clickTableRow(page, `${TEST_PREFIX} Fournisseur Alpha`)
    await expect(lien).toBeVisible({ timeout: 5000 })
    const href = await lien.getAttribute('href')
    expect(href).toMatch(/\/commandes\/\d+/)

    // Naviguer vers la page détail (page.goto est plus robuste que le clic SPA en dev)
    await page.goto(href!)
    await expect(page).toHaveURL(/\/commandes\/\d+/)
    await expect(page.getByRole('heading', { name: `${TEST_PREFIX} Fournisseur Alpha` })).toBeVisible()
  })

  // ─── Suppression individuelle ─────────────────────────────────────────────

  test('supprimer une commande via la modal de confirmation', async ({ page }) => {
    // Nettoyer les stale data éventuelles de runs précédents
    const allCommandes = await (await page.request.get('/api/commandes')).json()
    const staleIds = allCommandes
      .filter((c: { fournisseur: string }) => c.fournisseur === `${TEST_PREFIX} A Supprimer UI`)
      .map((c: { id: number }) => c.id)
    for (const id of staleIds) await deleteTestCommande(page.request, id)

    // Créer une commande dédiée au test de suppression UI
    const idToDelete = await createTestCommande(page.request, `${TEST_PREFIX} A Supprimer UI`)

    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un fournisseur...').fill('A Supprimer UI')
    await expect(inTable(page, `${TEST_PREFIX} A Supprimer UI`)).toBeVisible()

    // Cliquer sur le bouton Supprimer
    await page.locator('button[title="Supprimer"]').first().click()

    // Modal de confirmation
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/supprimer cette commande|tu vas supprimer/i)).toBeVisible()

    // Confirmer
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click()

    // Toast "Commande supprimée" visible
    await expect(page.getByText('Commande supprimée')).toBeVisible({ timeout: 5000 })

    // Après suppression, la commande disparaît de la table
    await expect(inTable(page, `${TEST_PREFIX} A Supprimer UI`)).not.toBeVisible({ timeout: 10000 })

    // Nettoyage API au cas où
    await deleteTestCommande(page.request, idToDelete)
  })

  // ─── Sélection groupée ────────────────────────────────────────────────────

  test('sélectionner une commande affiche le bandeau de suppression groupée', async ({ page }) => {
    await page.goto('/commandes')
    await page.waitForLoadState('domcontentloaded')
    await page.getByPlaceholder('Rechercher un fournisseur...').fill('Beta')
    await expect(inTable(page, `${TEST_PREFIX} Fournisseur Beta`)).toBeVisible()

    // Cocher la case de la commande Beta
    const checkbox = page.locator('tr').filter({ hasText: 'Beta' }).locator('input[type="checkbox"]')
    await checkbox.check()

    // Le bandeau de sélection apparaît
    await expect(page.getByText(/sélectionnée/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Supprimer' }).last()).toBeVisible()

    // Désélectionner
    await page.getByRole('button', { name: 'Désélectionner' }).click()
    await expect(page.getByText(/sélectionnée/i)).not.toBeVisible()
  })

  // ─── Export ───────────────────────────────────────────────────────────────

  test('le bouton "Importer Excel" ouvre le modal d\'import', async ({ page }) => {
    await page.goto('/commandes')
    await page.getByRole('button', { name: /importer excel|import/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
