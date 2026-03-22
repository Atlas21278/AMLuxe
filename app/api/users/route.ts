import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const users = await prisma.user.findMany({
    select: { id: true, email: true, nom: true, role: true, actif: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { email, nom, motDePasse, role } = await req.json()

  if (!email || !nom || !motDePasse) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(motDePasse, 12)

  try {
    const user = await prisma.user.create({
      data: { email, nom, motDePasse: hashedPassword, role: role || 'admin' },
      select: { id: true, email: true, nom: true, role: true, actif: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }
}
