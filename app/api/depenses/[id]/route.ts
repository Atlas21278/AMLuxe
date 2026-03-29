import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  const { date, montant, categorie, description } = await req.json()

  const depense = await prisma.depensePro.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined,
      montant: montant !== undefined ? Number(montant) : undefined,
      categorie: categorie || undefined,
      description: description !== undefined ? (description || null) : undefined,
    },
  })
  return NextResponse.json(depense)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await prisma.depensePro.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
