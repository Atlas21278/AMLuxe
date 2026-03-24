/**
 * global-setup.ts
 * Exécuté une fois avant tous les tests.
 * Se connecte avec le compte admin et sauvegarde la session dans tests/.auth/user.json.
 * Tous les specs réutilisent ensuite cette session (storageState).
 */
import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export default async function globalSetup() {
  const authDir = path.join(__dirname, '.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('http://localhost:3000/login')

  // Attendre que le formulaire soit prêt (page client-side)
  await page.waitForSelector('#email', { timeout: 30000 })

  await page.fill('#email', process.env.TEST_ADMIN_EMAIL ?? 'admin@amluxe.fr')
  await page.fill('#password', process.env.TEST_ADMIN_PASSWORD ?? 'Admin2024!')
  await page.click('button[type="submit"]')

  // Attendre la redirection après connexion
  await page.waitForURL('**/commandes', { timeout: 15000 })

  // Sauvegarder cookies + localStorage
  await context.storageState({ path: path.join(authDir, 'user.json') })

  await browser.close()
  console.log('✓ Session admin sauvegardée (tests/.auth/user.json)')
}
