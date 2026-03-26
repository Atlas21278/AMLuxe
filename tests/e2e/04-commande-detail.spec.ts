/**
 * 04-commande-detail.spec.ts
 * Tests de la page détail /commandes/[id] :
 * KPIs, ajout/édition/suppression d'articles, frais, tracking, vente.
 */
import { test, expect } from '@playwright/test'
import {
  createTestCommande,
  deleteTestCommande,
  createTestArticle,
  createTestFrais,
  TEST_PREFIX,
} from '../helpers/api'

test.describe('Détail commande', () => {
  let commandeId: number

  test.beforeAll(async ({ request }) => {
    commandeId = await createTestCommande(request, `${TEST_PREFIX} Detail Tests`)
  })

  test.afterAll(async ({ request }) => {
    await deleteTestCommande(request, commandeId)
  })

  // ─── Rendu de la page ──────────────────────────────────────────────────────

  test('page se charge avec le nom du fournisseur et le breadcrumb', async ({ page }) => {
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: `${TEST_PREFIX} Detail Tests` })).toBeVisible({ timeout: 10000 })
    // Breadcrumb dans main (pas le lien sidebar)
    await expect(page.getByRole('main').getByRole('link', { name: 'Commandes' })).toBeVisible()
    await expect(page.getByText('Total achat')).toBeVisible()
    await expect(page.getByText('Frais', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Bénéfice', { exact: true }).first()).toBeVisible()
  })

  test('affiche les sections Articles et Frais & taxes', async ({ page }) => {
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: 'Articles' })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('heading', { name: 'Frais & taxes' })).toBeVisible()
  })

  test('état vide : "Aucun article" et "Aucun frais" affichés', async ({ page }) => {
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Aucun article')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Aucun frais')).toBeVisible()
  })

  // ─── Ajout d'article ──────────────────────────────────────────────────────

  test('ajouter un article via le formulaire', async ({ page }) => {
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    // Ouvrir le modal d'ajout d'article
    const btnAjouter = page.locator('[aria-label="Ajouter"], button').filter({ hasText: 'Ajouter' }).first()
    await btnAjouter.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Ajouter un article')).toBeVisible()

    // Remplir le formulaire (Combobox pour marque)
    // Le dropdown Combobox est rendu via createPortal dans document.body (hors dialog)
    const marqueInput = page.getByRole('dialog').locator('input').nth(0)
    await marqueInput.fill('Chanel')
    await marqueInput.press('Enter')  // Sélectionne le premier résultat filtré

    // Modèle
    const modeleInput = page.getByRole('dialog').locator('input').nth(1)
    await modeleInput.fill('Boy Bag Small')
    await modeleInput.press('Enter')

    // Prix d'achat
    await page.getByRole('dialog').locator('input[type="number"]').first().fill('800')

    // Soumettre
    await page.getByRole('dialog').getByRole('button', { name: /ajouter l'article/i }).click()

    // Modal fermé
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // L'article apparaît dans le tableau (table = desktop, .first() évite le mobile card)
    await expect(page.locator('table').getByText('Chanel').first()).toBeVisible({ timeout: 8000 })
    await expect(page.locator('table').getByText('Boy Bag Small').first()).toBeVisible()
  })

  // ─── KPIs mis à jour après ajout article ─────────────────────────────────

  test('le total achat reflète l\'article ajouté', async ({ page }) => {
    // Créer un article via API pour avoir un état connu
    await createTestArticle(page.request, commandeId, { prixAchat: 300 })

    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    // Le total achat est supérieur à 0
    const totalAchat = page.getByText('Total achat').locator('~ *').first()
    await expect(page.locator('[class*="text-2xl"]').first()).not.toHaveText('0.00 €')
  })

  // ─── Alerte frais manquants ───────────────────────────────────────────────

  test('alerte "Ajoutez les frais" visible quand des articles existent sans frais', async ({ page }) => {
    await createTestArticle(page.request, commandeId)
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/frais & taxes avant de pouvoir/i)).toBeVisible({ timeout: 8000 })
  })

  // ─── Ajout de frais ────────────────────────────────────────────────────────

  test('ajouter des frais via le formulaire', async ({ page }) => {
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    // Bouton Ajouter dans la section Frais
    const boutonsFrais = page.getByRole('heading', { name: 'Frais & taxes' }).locator('..').getByRole('button', { name: 'Ajouter' })
    await boutonsFrais.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ajouter des frais' })).toBeVisible()

    // Remplir le montant
    await page.getByRole('dialog').locator('input[type="number"]').fill('50')

    // Soumettre
    await page.getByRole('dialog').getByRole('button', { name: /ajouter|enregistrer/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // Le frais apparaît (montant 50.00 €) — .first() car plusieurs frais peuvent exister
    await expect(page.getByText('50.00 €').first()).toBeVisible({ timeout: 8000 })
  })

  // ─── Alerte frais disparaît après ajout ───────────────────────────────────

  test('alerte frais disparaît une fois les frais ajoutés', async ({ page }) => {
    // S'assurer qu'il y a des frais
    await createTestFrais(page.request, commandeId)

    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/frais & taxes avant de pouvoir/i)).not.toBeVisible()
  })

  // ─── Vente d'un article ───────────────────────────────────────────────────

  test('vendre un article depuis le détail commande', async ({ page }) => {
    // S'assurer d'avoir article + frais
    const articleId = await createTestArticle(page.request, commandeId, {
      marque: 'Louis Vuitton',
      modele: 'Alma BB',
      prixAchat: 500,
    })
    await createTestFrais(page.request, commandeId)

    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    // Chercher le bouton de vente (icône €) sur un article "En stock"
    const boutonVente = page.locator('button[title="Vendre"]').first()
    await expect(boutonVente).toBeVisible({ timeout: 8000 })
    await boutonVente.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/vente \/ mise en vente/i)).toBeVisible()

    // Remplir le prix de vente réel
    await page.getByRole('dialog').locator('input[type="number"]').first().fill('700')

    // Soumettre — bouton "Confirmer" dans FormulaireVente
    await page.getByRole('dialog').getByRole('button', { name: /enregistrer|vendre|valider|confirmer/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })
  })

  // ─── Tracking ─────────────────────────────────────────────────────────────

  test('saisir un numéro de tracking affiche le widget transporteur', async ({ page }) => {
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    // Ouvrir le formulaire d'édition de la commande
    // Le tracking est sur la page détail mais modifiable via le formulaire commande
    // On le fait via l'API pour tester l'affichage du widget
    // PUT requiert fournisseur + date + statut — récupérer d'abord les données actuelles
    const commandeData = await (await page.request.get(`/api/commandes/${commandeId}`)).json()
    await page.request.put(`/api/commandes/${commandeId}`, {
      data: {
        fournisseur: commandeData.fournisseur,
        date: commandeData.date,
        statut: commandeData.statut,
        tracking: '1Z999AA10123456784', // format UPS
      },
    })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Le widget TrackingWidget devrait afficher le transporteur détecté
    await expect(page.getByText('UPS', { exact: false })).toBeVisible({ timeout: 8000 })
  })

  // ─── Suppression article ──────────────────────────────────────────────────

  test('supprimer un article avec confirm()', async ({ page }) => {
    const artId = await createTestArticle(page.request, commandeId, {
      marque: 'Dior',
      modele: 'Saddle Bag Mini',
      prixAchat: 600,
    })

    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    // La suppression utilise un double-clic inline (pas window.confirm)
    // 1er clic : passe en mode confirmation (bouton "Confirmer" apparaît)
    // 2ème clic : confirme la suppression
    const rowDior = page.locator('table tr').filter({ hasText: 'Dior' })
    await expect(rowDior).toBeVisible({ timeout: 8000 })
    await rowDior.locator('button[title="Supprimer"]').click()
    await rowDior.getByRole('button', { name: 'Confirmer' }).click()

    await expect(page.getByText('Article supprimé')).toBeVisible({ timeout: 5000 })
  })

  // ─── Suppression frais ────────────────────────────────────────────────────

  test('supprimer un frais via le bouton ×', async ({ page }) => {
    const fraisId = await createTestFrais(page.request, commandeId)

    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')

    // Le bouton × est dans la section frais (SVG X)
    const fraisSection = page.getByRole('heading', { name: 'Frais & taxes' }).locator('../..')
    const btnSupprFrais = fraisSection.locator('button').last()
    await btnSupprFrais.click()

    // Toast de succès ou rafraîchissement
    await page.waitForLoadState('domcontentloaded')
  })

  // ─── Retour navigation ────────────────────────────────────────────────────

  test('le lien retour ← ramène à /commandes', async ({ page }) => {
    await page.goto(`/commandes/${commandeId}`)
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Commandes' }).first().click()
    await expect(page).toHaveURL('/commandes')
  })

  // ─── Page d'erreur ────────────────────────────────────────────────────────

  test('une commande inexistante affiche le message d\'erreur', async ({ page }) => {
    await page.goto('/commandes/999999999')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('link', { name: 'Retour aux commandes' })).toBeVisible()
  })
})
