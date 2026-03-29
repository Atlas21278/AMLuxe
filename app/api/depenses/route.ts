import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const depenses = await prisma.depensePro.findMany({
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(depenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { date, montant, categorie, description } = await req.json()
  if (!date || !montant || !categorie) {
    return NextResponse.json({ error: 'date, montant et categorie sont requis' }, { status: 400 })
  }

  const depense = await prisma.depensePro.create({
    data: {
      date: new Date(date),
      montant: Number(montant),
      categorie,
      description: description || null,
    },
  })
  return NextResponse.json(depense, { status: 201 })
}
