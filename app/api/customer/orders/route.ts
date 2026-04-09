import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.CUSTOMER_API_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const clerkUserId = req.headers.get('x-clerk-user-id')
  if (!clerkUserId) {
    return NextResponse.json({ error: 'clerkUserId requis' }, { status: 400 })
  }

  const orders = await prisma.customerOrder.findMany({
    where: { clerkUserId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}
