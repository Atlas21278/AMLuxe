import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const commande = await prisma.commande.findUnique({
    where: { id: Number(params.id) },
    include: { articles: true, frais: true },
  })
  if (!commande) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(commande)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (!body.fournisseur?.trim()) {
    return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 })
  }

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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Admins seulement
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé — réservé aux admins' }, { status: 403 })
  }

  await prisma.commande.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
