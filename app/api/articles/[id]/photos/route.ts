import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UTApi } from 'uploadthing/server'

const MAX_PHOTOS = 6
const utapi = new UTApi()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = Number(params.id)
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })

  if (article.photos.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos par article` }, { status: 400 })
  }

  const { url } = await req.json()
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  const updated = await prisma.article.update({
    where: { id },
    data: { photos: [...article.photos, url] },
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

  const photoToDelete = article.photos[Number(index)]

  // Supprimer du CDN Uploadthing si c'est une URL (pas du base64 legacy)
  if (photoToDelete && photoToDelete.startsWith('https://')) {
    const fileKey = photoToDelete.split('/f/')[1]
    if (fileKey) {
      await utapi.deleteFiles(fileKey).catch(() => {
        // Erreur CDN non bloquante
      })
    }
  }

  const photos = article.photos.filter((_, i) => i !== Number(index))
  const updated = await prisma.article.update({ where: { id }, data: { photos } })

  return NextResponse.json({ photos: updated.photos })
}
