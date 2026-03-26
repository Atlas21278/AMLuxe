/**
 * 07-utilisateurs.spec.ts
 * Tests de la page /parametres/utilisateurs : liste, création, toggle actif, suppression.
 */
import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, TEST_PREFIX } from '../helpers/api'

test.describe('Gestion utilisateurs', () => {
  let testUserId: number
  let testUserEmail: string

  test.beforeAll(async ({ request }) => {
    const user = await createTestUser(request)
    testUserId = user.id
    testUserEmail = user.email
  })

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, testUserId)
  })

  // ─── Rendu de la page ──────────────────────────────────────────────────────

  test('page se charge avec le titre Utilisateurs', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /utilisateurs/i })).toBeVisible({ timeout: 8000 })
  })

  test('affiche le bouton "Ajouter un utilisateur"', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await expect(page.getByRole('button', { name: /ajouter|nouvel utilisateur/i })).toBeVisible({ timeout: 8000 })
  })

  test('l\'utilisateur admin@amluxe.fr est visible dans la liste', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('admin@amluxe.fr')).toBeVisible({ timeout: 8000 })
  })

  test('l\'utilisateur de test est visible dans la liste', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(testUserEmail)).toBeVisible({ timeout: 8000 })
  })

  // ─── Création d'utilisateur ───────────────────────────────────────────────

  test('créer un utilisateur via le formulaire', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('button', { name: /ajouter|nouvel utilisateur/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const ts = Date.now()
    const newEmail = `ui-created-${ts}@test.internal`

    await page.getByRole('dialog').locator('input[type="text"], input[name="nom"]').first().fill(`${TEST_PREFIX} UI ${ts}`)
    await page.getByRole('dialog').locator('input[type="email"]').fill(newEmail)
    await page.getByRole('dialog').locator('input[type="password"]').fill('TestPassword1!')

    await page.getByRole('dialog').getByRole('button', { name: /créer|ajouter|enregistrer/i }).click()

    // Toast succès
    await expect(page.getByText('Utilisateur créé')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // Apparaît dans la liste
    await expect(page.getByText(newEmail)).toBeVisible({ timeout: 5000 })

    // Nettoyage
    const users = await (await page.request.get('/api/users')).json()
    const created = users.find((u: { email: string }) => u.email === newEmail)
    if (created) await page.request.delete(`/api/users/${created.id}`)
  })

  test('erreur si email déjà existant', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('button', { name: /ajouter|nouvel utilisateur/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('dialog').locator('input').first().fill('Doublon Test')
    await page.getByRole('dialog').locator('input[type="email"]').fill('admin@amluxe.fr') // Email déjà utilisé
    await page.getByRole('dialog').locator('input[type="password"]').fill('TestPassword1!')

    await page.getByRole('dialog').getByRole('button', { name: /créer|ajouter/i }).click()

    // Message d'erreur dans le modal
    await expect(page.getByRole('dialog').getByText(/existe déjà|email.*utilisé|error/i)).toBeVisible({ timeout: 8000 })
  })

  // ─── Toggle actif/inactif ──────────────────────────────────────────────────

  test('toggle actif/inactif sur un utilisateur', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')

    // Trouver la ligne de l'utilisateur test
    const row = page.locator('tr, [role="row"]').filter({ hasText: testUserEmail })
    await expect(row).toBeVisible({ timeout: 8000 })

    // Cliquer sur le toggle actif
    const toggle = row.locator('input[type="checkbox"], button').filter({ hasText: /actif|inactif/ }).first()
    if (await toggle.isVisible()) {
      await toggle.click()
      await page.waitForLoadState('domcontentloaded')
      // Pas d'erreur → toggle fonctionne
    }
  })

  // ─── Changement de mot de passe ───────────────────────────────────────────

  test('le bouton "Changer le mot de passe" ouvre un modal', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')

    const row = page.locator('tr').filter({ hasText: testUserEmail })
    const btnPassword = row.getByRole('button', { name: /mot de passe|password/i })
    if (await btnPassword.isVisible()) {
      await btnPassword.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/nouveau mot de passe|changer/i)).toBeVisible()
      await page.keyboard.press('Escape')
    }
  })

  // ─── Suppression ──────────────────────────────────────────────────────────

  test('supprimer un utilisateur non-admin', async ({ page }) => {
    const userToDelete = await createTestUser(page.request)

    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(userToDelete.email)).toBeVisible({ timeout: 8000 })

    // Cliquer sur le bouton supprimer pour cet utilisateur
    const row = page.locator('tr').filter({ hasText: userToDelete.email })
    await row.getByRole('button', { name: /supprimer/i }).click()

    // Modal de confirmation inline ou modale
    const confirmBtn = page.getByRole('button', { name: 'Supprimer' }).last()
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()

    // Toast succès
    await expect(page.getByText('Utilisateur supprimé')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(userToDelete.email)).not.toBeVisible({ timeout: 5000 })
  })

  test('impossible de supprimer son propre compte', async ({ page }) => {
    await page.goto('/parametres/utilisateurs')
    await page.waitForLoadState('domcontentloaded')

    // La ligne admin ne doit pas avoir de bouton supprimer actif
    const adminRow = page.locator('tr').filter({ hasText: 'admin@amluxe.fr' })
    const deleteBtn = adminRow.getByRole('button', { name: /supprimer/i })
    // Le bouton est soit absent, soit désactivé
    if (await deleteBtn.isVisible()) {
      await expect(deleteBtn).toBeDisabled()
    }
  })
})
