import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const CHAMPS_SURVEILLES: (keyof {
  statut: string; prixAchat: number; prixVente: number | null; prixVenteReel: number | null;
  fraisVente: number | null; plateforme: string | null; etat: string; notes: string | null;
})[] = ['statut', 'prixAchat', 'prixVente', 'prixVenteReel', 'fraisVente', 'plateforme', 'etat', 'notes']

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const historique = await prisma.articleHistorique.findMany({
    where: { articleId: Number(params.id) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(historique)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const id = Number(params.id)

  const ancien = await prisma.article.findUnique({ where: { id } })
  if (!ancien) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })

  const nouveau = {
    marque: body.marque,
    modele: body.modele,
    prixAchat: Math.max(0, Number(body.prixAchat) || 0),
    etat: body.etat,
    refFournisseur: body.refFournisseur || null,
    statut: body.statut,
    prixVente: body.prixVente ? Math.max(0, Number(body.prixVente)) : null,
    plateforme: body.plateforme || null,
    prixVenteReel: body.prixVenteReel ? Math.max(0, Number(body.prixVenteReel)) : null,
    fraisVente: body.fraisVente ? Math.max(0, Number(body.fraisVente)) : null,
    dateVente: body.dateVente ? new Date(body.dateVente) : null,
    notes: body.notes || null,
  }

  const article = await prisma.article.update({ where: { id }, data: nouveau })

  // Enregistrer les changements
  const changements = CHAMPS_SURVEILLES
    .filter((champ) => String(ancien[champ] ?? '') !== String(nouveau[champ as keyof typeof nouveau] ?? ''))
    .map((champ) => ({
      articleId: id,
      champ,
      ancienne: String(ancien[champ] ?? ''),
      nouvelle: String(nouveau[champ as keyof typeof nouveau] ?? ''),
    }))

  if (changements.length > 0) {
    await prisma.articleHistorique.createMany({ data: changements })
  }

  if (changements.length > 0) {
    const changementsMap = Object.fromEntries(changements.map((c) => [c.champ, { de: c.ancienne, vers: c.nouvelle }]))
    await logAudit('UPDATE', 'article', id, session.user?.email ?? undefined, changementsMap)
  }

  return NextResponse.json(article)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.article.update({
    where: { id: Number(params.id) },
    data: { deletedAt: new Date() },
  })
  await logAudit('DELETE', 'article', Number(params.id), session.user?.email ?? undefined)
  return NextResponse.json({ ok: true })
}
