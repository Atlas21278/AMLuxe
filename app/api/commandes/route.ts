import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const commandes = await prisma.commande.findMany({
    include: { articles: true, frais: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(commandes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (!body.fournisseur?.trim()) {
    return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 })
  }

  const articles: { marque: string; modele: string; prixAchat: number; etat: string; refFournisseur?: string }[] = body.articles ?? []
  const frais: { type: string; montant: number; description?: string }[] = body.frais ?? []

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
          prixAchat: Math.max(0, Number(a.prixAchat) || 0),
          etat: a.etat,
          refFournisseur: a.refFournisseur || null,
          statut: 'En stock',
        })),
      } : undefined,
      frais: frais.length > 0 ? {
        create: frais.map((f) => ({
          type: f.type,
          montant: Math.max(0, Number(f.montant) || 0),
          description: f.description || null,
        })),
      } : undefined,
    },
    include: { articles: true, frais: true },
  })
  return NextResponse.json(commande, { status: 201 })
}
