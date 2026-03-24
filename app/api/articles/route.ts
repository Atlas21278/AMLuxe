import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const commandeId = searchParams.get('commandeId')
  const pageParam = searchParams.get('page')
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const search = searchParams.get('search')?.trim() ?? ''
  const statut = searchParams.get('statut') ?? ''
  const marque = searchParams.get('marque') ?? ''
  const plateforme = searchParams.get('plateforme') ?? ''

  // Sans pagination : retour compat (stats, dashboard, etc.)
  if (!pageParam && !commandeId) {
    const articles = await prisma.article.findMany({
      where: { deletedAt: null },
      include: { commande: { include: { frais: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(articles)
  }

  // Filtre par commandeId (détail commande — pas de pagination)
  if (commandeId) {
    const articles = await prisma.article.findMany({
      where: { commandeId: Number(commandeId), deletedAt: null },
      include: { commande: { include: { frais: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(articles)
  }

  // Pagination + filtres serveur
  const page = Math.max(1, Number(pageParam))
  const where = {
    deletedAt: null,
    ...(search ? {
      OR: [
        { marque: { contains: search, mode: 'insensitive' as const } },
        { modele: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(statut && statut !== 'tous' ? { statut } : {}),
    ...(marque && marque !== 'toutes' ? { marque } : {}),
    ...(plateforme && plateforme !== 'toutes' ? { plateforme } : {}),
  }

  const [data, total, statsGroups, marques, plateformes] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { commande: { include: { frais: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
    prisma.article.groupBy({ by: ['statut'], _count: { _all: true } }),
    prisma.article.findMany({ select: { marque: true }, distinct: ['marque'], orderBy: { marque: 'asc' } }),
    prisma.article.findMany({
      where: { plateforme: { not: null } },
      select: { plateforme: true },
      distinct: ['plateforme'],
      orderBy: { plateforme: 'asc' },
    }),
  ])

  const statsMap = Object.fromEntries(statsGroups.map((g) => [g.statut, g._count._all]))
  const totalAll = statsGroups.reduce((s, g) => s + g._count._all, 0)

  return NextResponse.json({
    data,
    total,
    stats: {
      total: totalAll,
      enStock: statsMap['En stock'] ?? 0,
      enVente: statsMap['En vente'] ?? 0,
      vendu: statsMap['Vendu'] ?? 0,
    },
    marques: marques.map((m) => m.marque),
    plateformes: plateformes.map((p) => p.plateforme).filter(Boolean),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (!body.marque?.trim() || !body.modele?.trim()) {
    return NextResponse.json({ error: 'Marque et modèle requis' }, { status: 400 })
  }
  if (!body.commandeId) {
    return NextResponse.json({ error: 'CommandeId requis' }, { status: 400 })
  }

  const article = await prisma.article.create({
    data: {
      marque: body.marque,
      modele: body.modele,
      prixAchat: Math.max(0, Number(body.prixAchat) || 0),
      etat: body.etat,
      refFournisseur: body.refFournisseur || null,
      statut: body.statut || 'En stock',
      devise: body.devise || 'EUR',
      commandeId: Number(body.commandeId),
    },
  })
  return NextResponse.json(article, { status: 201 })
}
