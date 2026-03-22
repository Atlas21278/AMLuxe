import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (!body.type?.trim()) {
    return NextResponse.json({ error: 'Type de frais requis' }, { status: 400 })
  }
  if (!body.commandeId) {
    return NextResponse.json({ error: 'CommandeId requis' }, { status: 400 })
  }

  const frais = await prisma.frais.create({
    data: {
      type: body.type,
      montant: Math.max(0, Number(body.montant) || 0),
      description: body.description || null,
      commandeId: Number(body.commandeId),
    },
  })
  return NextResponse.json(frais, { status: 201 })
}
