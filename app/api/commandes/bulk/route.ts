import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé — réservé aux admins' }, { status: 403 })
  }

  const body = await req.json()
  const ids: number[] = (body.ids ?? []).map(Number).filter(Boolean)

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Aucun ID fourni' }, { status: 400 })
  }

  // Transaction : toutes les suppressions réussissent ou aucune
  await prisma.$transaction(
    ids.map((id) => prisma.commande.delete({ where: { id } }))
  )

  return NextResponse.json({ ok: true, supprimees: ids.length })
}
