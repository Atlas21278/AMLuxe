import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/articles/bulk — changer le statut de plusieurs articles
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ids, statut } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0 || !statut) {
    return NextResponse.json({ error: 'ids et statut requis' }, { status: 400 })
  }

  await prisma.article.updateMany({
    where: { id: { in: ids.map(Number) } },
    data: { statut },
  })

  return NextResponse.json({ updated: ids.length })
}

// DELETE /api/articles/bulk — supprimer plusieurs articles
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids requis' }, { status: 400 })
  }

  await prisma.$transaction(
    ids.map((id: number) => prisma.article.delete({ where: { id } }))
  )

  return NextResponse.json({ deleted: ids.length })
}
