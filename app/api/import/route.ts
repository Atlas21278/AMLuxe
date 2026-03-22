import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ArticleImport {
  marque: string
  modele: string
  prixAchat: number
  etat: string
  refFournisseur?: string
  statut?: string
  prixVente?: number
  plateforme?: string
  prixVenteReel?: number
  fraisVente?: number
  dateVente?: string
}

interface FraisImport {
  type: string
  montant: number
  description?: string
}

interface CommandeImport {
  fournisseur: string
  date: string
  statut: string
  tracking?: string
  notes?: string
  articles: ArticleImport[]
  frais: FraisImport[]
}

export async function POST(req: NextRequest) {
  const body: { commandes: CommandeImport[] } = await req.json()

  let nbCommandes = 0
  let nbArticles = 0
  let nbFrais = 0

  for (const c of body.commandes) {
    const commande = await prisma.commande.create({
      data: {
        fournisseur: c.fournisseur,
        date: c.date ? new Date(c.date) : new Date(),
        statut: c.statut || 'En préparation',
        tracking: c.tracking || null,
        notes: c.notes || null,
      },
    })
    nbCommandes++

    for (const a of c.articles) {
      await prisma.article.create({
        data: {
          commandeId: commande.id,
          marque: a.marque,
          modele: a.modele,
          prixAchat: Number(a.prixAchat) || 0,
          etat: a.etat || 'Très bon état',
          refFournisseur: a.refFournisseur || null,
          statut: a.statut || 'En stock',
          prixVente: a.prixVente ? Number(a.prixVente) : null,
          plateforme: a.plateforme || null,
          prixVenteReel: a.prixVenteReel ? Number(a.prixVenteReel) : null,
          fraisVente: a.fraisVente ? Number(a.fraisVente) : null,
          dateVente: a.dateVente ? new Date(a.dateVente) : null,
        },
      })
      nbArticles++
    }

    for (const f of c.frais) {
      await prisma.frais.create({
        data: {
          commandeId: commande.id,
          type: f.type || 'Autre',
          montant: Number(f.montant) || 0,
          description: f.description || null,
        },
      })
      nbFrais++
    }
  }

  return NextResponse.json({ nbCommandes, nbArticles, nbFrais })
}
