import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const ressource = searchParams.get('ressource') ?? ''

  const logs = await prisma.audit.findMany({
    where: ressource ? { ressource } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json(logs)
}
