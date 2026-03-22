import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const commande = await prisma.commande.findUnique({
    where: { id: Number(params.id) },
    include: { articles: true, frais: true },
  })
  if (!commande) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(commande)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const commande = await prisma.commande.update({
    where: { id: Number(params.id) },
    data: {
      fournisseur: body.fournisseur,
      date: new Date(body.date),
      statut: body.statut,
      tracking: body.tracking || null,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(commande)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.commande.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
