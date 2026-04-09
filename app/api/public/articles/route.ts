import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const articles = await prisma.article.findMany({
    where: {
      statut: 'En vente',
      deletedAt: null,
    },
    select: {
      id: true,
      marque: true,
      modele: true,
      etat: true,
      prixVente: true,
      plateforme: true,
      lienAnnonce: true,
      photos: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(articles, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
