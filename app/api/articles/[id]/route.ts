import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const article = await prisma.article.update({
    where: { id: Number(params.id) },
    data: {
      marque: body.marque,
      modele: body.modele,
      prixAchat: Number(body.prixAchat),
      etat: body.etat,
      refFournisseur: body.refFournisseur || null,
      statut: body.statut,
      prixVente: body.prixVente ? Number(body.prixVente) : null,
      plateforme: body.plateforme || null,
      prixVenteReel: body.prixVenteReel ? Number(body.prixVenteReel) : null,
      fraisVente: body.fraisVente ? Number(body.fraisVente) : null,
      dateVente: body.dateVente ? new Date(body.dateVente) : null,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(article)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.article.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
