import { defineConfig, devices } from '@playwright/test'
import os from 'os'
import path from 'path'

const AUTH_FILE = path.join(os.tmpdir(), 'amluxe-test-auth.json')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,   // Séquentiel — évite les conflits de données en DB
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  globalSetup: './tests/global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,   // Réutilise le serveur dev si déjà lancé
    timeout: 120 * 1000,
    stderr: 'pipe',
  },
})
