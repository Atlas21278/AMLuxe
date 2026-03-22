import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const commandeId = searchParams.get('commandeId')

  const articles = await prisma.article.findMany({
    where: commandeId ? { commandeId: Number(commandeId) } : undefined,
    include: { commande: { include: { frais: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(articles)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (!body.marque?.trim() || !body.modele?.trim()) {
    return NextResponse.json({ error: 'Marque et modèle requis' }, { status: 400 })
  }
  if (!body.commandeId) {
    return NextResponse.json({ error: 'CommandeId requis' }, { status: 400 })
  }

  const article = await prisma.article.create({
    data: {
      marque: body.marque,
      modele: body.modele,
      prixAchat: Math.max(0, Number(body.prixAchat) || 0),
      etat: body.etat,
      refFournisseur: body.refFournisseur || null,
      statut: body.statut || 'En stock',
      commandeId: Number(body.commandeId),
    },
  })
  return NextResponse.json(article, { status: 201 })
}
