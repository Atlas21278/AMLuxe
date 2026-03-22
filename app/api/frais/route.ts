import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const frais = await prisma.frais.create({
    data: {
      type: body.type,
      montant: Number(body.montant),
      description: body.description || null,
      commandeId: Number(body.commandeId),
    },
  })
  return NextResponse.json(frais, { status: 201 })
}
