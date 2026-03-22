import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const abonnements = await prisma.abonnementMensuel.findMany({
    orderBy: { mois: 'asc' },
  })
  return NextResponse.json(abonnements)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { mois, montant } = await req.json()
  if (!mois) return NextResponse.json({ error: 'Mois requis' }, { status: 400 })

  const abonnement = await prisma.abonnementMensuel.upsert({
    where: { mois },
    update: { montant: Number(montant) || 0 },
    create: { mois, montant: Number(montant) || 0 },
  })
  return NextResponse.json(abonnement)
}
