/**
 * helpers/api.ts
 * Fonctions utilitaires pour créer/supprimer des données de test via l'API.
 * Utilise le contexte de requête Playwright déjà authentifié.
 * Préfixe '[TEST]' → données identifiables et nettoyables facilement.
 */
import type { APIRequestContext } from '@playwright/test'

export const TEST_PREFIX = '[TEST]'

// ─── Commandes ──────────────────────────────────────────────────────────────

export async function createTestCommande(
  request: APIRequestContext,
  fournisseur = `${TEST_PREFIX} Fournisseur`
): Promise<number> {
  const res = await request.post('/api/commandes', {
    data: { fournisseur, statut: 'En préparation', articles: [], frais: [] },
  })
  if (!res.ok) throw new Error(`createTestCommande échouée: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.id as number
}

export async function deleteTestCommande(request: APIRequestContext, id: number) {
  await request.delete(`/api/commandes/${id}`)
  // Ignore 404 si déjà supprimé par le test
}

// ─── Articles ────────────────────────────────────────────────────────────────

export async function createTestArticle(
  request: APIRequestContext,
  commandeId: number,
  overrides: Record<string, unknown> = {}
): Promise<number> {
  const res = await request.post('/api/articles', {
    data: {
      marque: 'Louis Vuitton',
      modele: 'Speedy 30',
      prixAchat: 450,
      etat: 'Très bon état',
      statut: 'En stock',
      commandeId,
      ...overrides,
    },
  })
  if (!res.ok) throw new Error(`createTestArticle échouée: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.id as number
}

export async function updateTestArticle(
  request: APIRequestContext,
  id: number,
  fields: Record<string, unknown>
): Promise<void> {
  const res = await request.put(`/api/articles/${id}`, { data: fields })
  if (!res.ok) throw new Error(`updateTestArticle échouée: ${res.status} ${await res.text()}`)
}

// ─── Frais ───────────────────────────────────────────────────────────────────

export async function createTestFrais(
  request: APIRequestContext,
  commandeId: number
): Promise<number> {
  const res = await request.post('/api/frais', {
    data: { type: 'Livraison', montant: 25, commandeId },
  })
  if (!res.ok) throw new Error(`createTestFrais échouée: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.id as number
}

// ─── Utilisateurs ────────────────────────────────────────────────────────────

export async function createTestUser(
  request: APIRequestContext
): Promise<{ id: number; nom: string; email: string }> {
  const ts = Date.now()
  const res = await request.post('/api/users', {
    data: {
      nom: `${TEST_PREFIX} User ${ts}`,
      email: `test-${ts}@test-amluxe.internal`,
      motDePasse: 'TestPassword1!',
      role: 'viewer',
    },
  })
  if (!res.ok) throw new Error(`createTestUser échouée: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function deleteTestUser(request: APIRequestContext, id: number) {
  await request.delete(`/api/users/${id}`)
}

// ─── Photos ───────────────────────────────────────────────────────────────────

// PNG 1×1 pixel blanc — image minimale valide pour les tests
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

export async function uploadTestPhoto(request: APIRequestContext, articleId: number): Promise<void> {
  const res = await request.post(`/api/articles/${articleId}/photos`, {
    multipart: {
      file: {
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from(TINY_PNG_B64, 'base64'),
      },
    },
  })
  if (!res.ok) throw new Error(`uploadTestPhoto échouée: ${res.status} ${await res.text()}`)
}
