/**
 * 09-api-publique.spec.ts
 * Tests des routes publiques : GET /api/public/articles, GET /api/public/articles/[id], POST /api/webhooks/stripe
 * Ces routes sont publiques — pas besoin du storageState auth.
 */
import { test, expect } from '@playwright/test'

// Ces routes sont publiques — pas besoin du storageState auth
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('API publique — /api/public/articles', () => {
  test('GET /api/public/articles retourne un tableau', async ({ request }) => {
    const res = await request.get('/api/public/articles')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('GET /api/public/articles ne contient pas prixAchat ni commandeId', async ({ request }) => {
    const res = await request.get('/api/public/articles')
    const data = await res.json()
    if (data.length > 0) {
      expect(data[0]).not.toHaveProperty('prixAchat')
      expect(data[0]).not.toHaveProperty('commandeId')
      expect(data[0]).not.toHaveProperty('prixVenteReel')
      expect(data[0]).not.toHaveProperty('fraisVente')
    }
  })

  test('GET /api/public/articles/99999 retourne 404', async ({ request }) => {
    const res = await request.get('/api/public/articles/99999')
    expect(res.status()).toBe(404)
  })

  test('GET /api/public/articles/abc retourne 400', async ({ request }) => {
    const res = await request.get('/api/public/articles/abc')
    expect(res.status()).toBe(400)
  })

  test('POST /api/webhooks/stripe sans signature retourne 400', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', { data: {} })
    expect(res.status()).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Signature manquante')
  })
})
