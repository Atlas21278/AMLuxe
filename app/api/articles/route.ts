import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const commandeId = searchParams.get('commandeId')

  const articles = await prisma.article.findMany({
    where: commandeId ? { commandeId: Number(commandeId) } : undefined,
    include: { commande: { select: { fournisseur: true, id: true, _count: { select: { frais: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(articles)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const article = await prisma.article.create({
    data: {
      marque: body.marque,
      modele: body.modele,
      prixAchat: Number(body.prixAchat),
      etat: body.etat,
      refFournisseur: body.refFournisseur || null,
      statut: body.statut || 'En stock',
      commandeId: Number(body.commandeId),
    },
  })
  return NextResponse.json(article, { status: 201 })
}
