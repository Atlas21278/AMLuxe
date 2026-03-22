import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { nom, email, motDePasse, role, actif } = await req.json()
  const data: Record<string, unknown> = {}

  if (nom) data.nom = nom
  if (email) data.email = email
  if (role) data.role = role
  if (typeof actif === 'boolean') data.actif = actif
  if (motDePasse) data.motDePasse = await bcrypt.hash(motDePasse, 12)

  const user = await prisma.user.update({
    where: { id: parseInt(params.id) },
    data,
    select: { id: true, email: true, nom: true, role: true, actif: true, createdAt: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const userId = parseInt(params.id)
  const currentUserId = parseInt(session.user.id)

  if (userId === currentUserId) {
    return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}
