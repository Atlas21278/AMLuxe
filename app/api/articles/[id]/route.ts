import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const article = await prisma.article.update({
    where: { id: Number(params.id) },
    data: {
      marque: body.marque,
      modele: body.modele,
      prixAchat: Math.max(0, Number(body.prixAchat) || 0),
      etat: body.etat,
      refFournisseur: body.refFournisseur || null,
      statut: body.statut,
      prixVente: body.prixVente ? Math.max(0, Number(body.prixVente)) : null,
      plateforme: body.plateforme || null,
      prixVenteReel: body.prixVenteReel ? Math.max(0, Number(body.prixVenteReel)) : null,
      fraisVente: body.fraisVente ? Math.max(0, Number(body.fraisVente)) : null,
      dateVente: body.dateVente ? new Date(body.dateVente) : null,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(article)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.article.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
