import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const article = await prisma.article.findFirst({
    where: {
      id,
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
      notes: true,
      createdAt: true,
    },
  })

  if (!article) {
    return NextResponse.json({ error: 'Article non disponible' }, { status: 404 })
  }

  return NextResponse.json(article, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
