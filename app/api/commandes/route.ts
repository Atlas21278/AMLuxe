import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const commandes = await prisma.commande.findMany({
    include: { articles: true, frais: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(commandes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const articles: { marque: string; modele: string; prixAchat: number; etat: string; refFournisseur?: string }[] = body.articles ?? []

  const commande = await prisma.commande.create({
    data: {
      fournisseur: body.fournisseur,
      date: new Date(body.date),
      statut: body.statut,
      tracking: body.tracking || null,
      notes: body.notes || null,
      articles: articles.length > 0 ? {
        create: articles.map((a) => ({
          marque: a.marque,
          modele: a.modele,
          prixAchat: Number(a.prixAchat),
          etat: a.etat,
          refFournisseur: a.refFournisseur || null,
          statut: 'En stock',
        })),
      } : undefined,
    },
    include: { articles: true, frais: true },
  })
  return NextResponse.json(commande, { status: 201 })
}
