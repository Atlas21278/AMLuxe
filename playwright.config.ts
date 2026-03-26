import { defineConfig, devices } from '@playwright/test'
import os from 'os'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(os.tmpdir(), 'amluxe-test-auth.json')

// Charger .env.test.local si présent (DATABASE_URL staging)
if (fs.existsSync('.env.test.local')) {
  const lines = fs.readFileSync('.env.test.local', 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=#\s][^=]*)\s*=\s*"?([^"]*)"?\s*$/)
    if (match) process.env[match[1]] = match[2]
  }
}

const TEST_BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

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
    baseURL: TEST_BASE_URL,
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
    command: 'npm run dev:test',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    stderr: 'pipe',
    env: {
      ...process.env, // inclut DATABASE_URL chargée depuis .env.test.local
    },
  },
})
