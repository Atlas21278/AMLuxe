import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function verifyRequest(req: NextRequest): string | null {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.CUSTOMER_API_SECRET) return null
  return req.headers.get('x-clerk-user-id')
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clerkUserId = verifyRequest(req)
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const existing = await prisma.customerAddress.findUnique({ where: { id } })
  if (!existing || existing.clerkUserId !== clerkUserId) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  await prisma.customerAddress.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clerkUserId = verifyRequest(req)
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const existing = await prisma.customerAddress.findUnique({ where: { id } })
  if (!existing || existing.clerkUserId !== clerkUserId) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  // Retirer le flag defaut sur toutes les adresses du user
  await prisma.customerAddress.updateMany({
    where: { clerkUserId },
    data: { defaut: false },
  })

  // Marquer celle-ci comme défaut
  const updated = await prisma.customerAddress.update({
    where: { id },
    data: { defaut: true },
  })

  return NextResponse.json(updated)
}
