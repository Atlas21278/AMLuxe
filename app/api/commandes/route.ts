import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const pageParam = searchParams.get('page')
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const search = searchParams.get('search')?.trim() ?? ''
  const statut = searchParams.get('statut') ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''

  const where = {
    deletedAt: null,
    ...(search ? { fournisseur: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(statut && statut !== 'tous' ? { statut } : {}),
    ...(dateFrom || dateTo ? {
      date: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
      },
    } : {}),
  }

  // Sans pagination : retour compat (dashboard, stats, etc.)
  if (!pageParam) {
    const commandes = await prisma.commande.findMany({
      where,
      include: { articles: true, frais: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(commandes)
  }

  const page = Math.max(1, Number(pageParam))
  const [data, total] = await Promise.all([
    prisma.commande.findMany({
      where,
      include: { articles: true, frais: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.commande.count({ where }),
  ])

  return NextResponse.json({ data, total })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (!body.fournisseur?.trim()) {
    return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 })
  }

  const articles: { marque: string; modele: string; prixAchat: number; etat: string; refFournisseur?: string }[] = body.articles ?? []
  const frais: { type: string; montant: number; description?: string }[] = body.frais ?? []

  const commande = await prisma.commande.create({
    data: {
      fournisseur: body.fournisseur,
      date: new Date(body.date),
      statut: body.statut,
      tracking: body.tracking || null,
      notes: body.notes || null,
      articles: articles.length > 0 ? {
        create: articles.map((a) => ({
          marque: a.marque,
          modele: a.modele,
          prixAchat: Math.max(0, Number(a.prixAchat) || 0),
          etat: a.etat,
          refFournisseur: a.refFournisseur || null,
          statut: 'En stock',
        })),
      } : undefined,
      frais: frais.length > 0 ? {
        create: frais.map((f) => ({
          type: f.type,
          montant: Math.max(0, Number(f.montant) || 0),
          description: f.description || null,
        })),
      } : undefined,
    },
    include: { articles: true, frais: true },
  })
  await logAudit('CREATE', 'commande', commande.id, session.user?.email ?? undefined, { fournisseur: commande.fournisseur })
  return NextResponse.json(commande, { status: 201 })
}
