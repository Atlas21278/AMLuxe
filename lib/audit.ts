import { prisma } from '@/lib/prisma'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'
type AuditRessource = 'commande' | 'article' | 'frais' | 'user'

export async function logAudit(
  action: AuditAction,
  ressource: AuditRessource,
  cible?: number,
  userEmail?: string,
  details?: Record<string, unknown>,
) {
  try {
    await prisma.audit.create({
      data: {
        action,
        ressource,
        cible: cible ?? null,
        userEmail: userEmail ?? null,
        details: details ? JSON.stringify(details) : null,
      },
    })
  } catch {
    // Ne jamais bloquer une opération à cause d'un échec de log
  }
}
