import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_PHOTOS = 6
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB par photo

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = Number(params.id)
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })

  if (article.photos.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos par article` }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image trop grande (max 2 Mo)' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const base64 = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`

  const updated = await prisma.article.update({
    where: { id },
    data: { photos: [...article.photos, base64] },
  })

  return NextResponse.json({ photos: updated.photos })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = Number(params.id)
  const { index } = await req.json()

  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })

  const photos = article.photos.filter((_, i) => i !== Number(index))
  const updated = await prisma.article.update({ where: { id }, data: { photos } })

  return NextResponse.json({ photos: updated.photos })
}
