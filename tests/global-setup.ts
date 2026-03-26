/**
 * global-setup.ts
 * Exécuté une fois avant tous les tests.
 * Se connecte avec le compte admin et sauvegarde la session dans tests/.auth/user.json.
 * Tous les specs réutilisent ensuite cette session (storageState).
 */
import { chromium } from '@playwright/test'
import os from 'os'
import path from 'path'

const AUTH_FILE = path.join(os.tmpdir(), 'amluxe-test-auth.json')

export default async function globalSetup() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('http://localhost:3000/login')

  // Attendre que React soit hydraté (la classe login-card-visible est ajoutée par useEffect)
  await page.waitForSelector('.login-card-visible', { timeout: 30000 })

  await page.fill('#email', process.env.TEST_ADMIN_EMAIL ?? 'admin@amluxe.fr')
  await page.fill('#password', process.env.TEST_ADMIN_PASSWORD ?? 'Admin2024!')
  await page.click('button[type="submit"]')

  // Attendre la redirection après connexion (DB Railway peut être lente)
  await page.waitForURL('**/commandes', { timeout: 30000 })

  // Sauvegarder cookies + localStorage dans le répertoire temp OS (hors du projet)
  // → évite de déclencher le Fast Refresh Next.js pendant les tests
  await context.storageState({ path: AUTH_FILE })

  await browser.close()
  console.log(`✓ Session admin sauvegardée (${AUTH_FILE})`)
}
